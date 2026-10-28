import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAppExits, isExitReasonReaderAvailable, type AppExit } from '../../modules/accounte-diagnostics';
import { crashlytics } from './crashlytics';
import { FATAL_JS_CRASH_KEY, reportError } from './errorReporter';

/**
 * On each launch, checks how the previous run of the app ended and tells
 * admin → App errors about the bad endings errorReporter can't see, because
 * the app was already gone:
 *
 * - "App crashed" — a native crash (Crashlytics or Android saw it). JS crashes
 *   are reported by errorReporter itself, so they are skipped here.
 * - "App froze" — Android closed it as not responding (ANR).
 * - "Closed by the phone" — Android or iOS closed AccountE while the person was
 *   using it, or while they were away in a picker / camera app / browser page
 *   and coming back (the "tapped ✓ and the app restarted on Home" case).
 *
 * Closing a backgrounded app later to free memory is normal and not reported,
 * and so is a close the person got back from: a flow that names its return
 * link (`returnUrl`) and the app was started again by that link.
 * Flows that leave the app are wrapped in withFlow() / markFlow(), and the
 * current screen is remembered with noteScreen(), so reports can say where.
 */

const LAST_SCREEN_KEY = 'accounte_last_screen_v1';
const FLOW_KEY = 'accounte_open_flow_v1';
const EXITS_CHECKED_KEY = 'accounte_exits_checked_v1';

/** A close this soon after a flow opened counts as "while it was open". */
const FLOW_WINDOW_MS = 15 * 60 * 1000;
/** RunningAppProcessInfo.IMPORTANCE_VISIBLE: AccountE was on screen. */
const IMPORTANCE_VISIBLE = 200;
const MAX_EXITS = 3;

type Flow = { name: string; screen: string; at: number; returnUrl?: string };
type FlowOptions = {
  /** The deep link the flow comes back by (a sign-in or payment page). */
  returnUrl?: string;
};

let started = false;
let lastScreen = '';
const openFlows: Flow[] = [];

// Every storage write waits for the previous run's state to be read first
// (startAppExitMonitor puts that read at the head of the queue), so this run
// never overwrites what the check needs.
let writes: Promise<void> = Promise.resolve();
const enqueue = (write: () => Promise<unknown>): Promise<void> => {
  writes = writes.then(write).then(
    () => undefined,
    () => undefined,
  );
  return writes;
};

const saveOpenFlow = () => {
  const top = openFlows[openFlows.length - 1];
  return top ? AsyncStorage.setItem(FLOW_KEY, JSON.stringify(top)) : AsyncStorage.removeItem(FLOW_KEY);
};

const parseFlow = (raw: string | null): Flow | null => {
  if (!raw) return null;
  try {
    const flow = JSON.parse(raw) as Partial<Flow>;
    return typeof flow?.name === 'string' && typeof flow.at === 'number'
      ? {
          name: flow.name,
          screen: typeof flow.screen === 'string' ? flow.screen : '',
          at: flow.at,
          ...(typeof flow.returnUrl === 'string' && flow.returnUrl ? { returnUrl: flow.returnUrl } : {}),
        }
      : null;
  } catch {
    return null;
  }
};

const duration = (ms: number): string => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 90) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 90 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
};

const onScreen = (screen: string) => (screen ? ` on ${screen}` : '');

/** Remember the current screen, so a report about this run can name it. */
export function noteScreen(pathname: string): void {
  if (!pathname || pathname === lastScreen) return;
  lastScreen = pathname;
  void enqueue(() => AsyncStorage.setItem(LAST_SCREEN_KEY, pathname));
}

/**
 * Mark a flow as open (a full-screen camera, a picker…); call the returned
 * function when it closes. If the app dies meanwhile, the next launch reports
 * which flow was open. Flows can nest — the innermost one is reported.
 */
export function markFlow(name: string, options: FlowOptions = {}): () => void {
  const flow: Flow = { name, screen: lastScreen, at: Date.now(), ...(options.returnUrl ? { returnUrl: options.returnUrl } : {}) };
  openFlows.push(flow);
  void enqueue(saveOpenFlow);
  crashlytics.log(`opened ${name}`);

  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    const index = openFlows.indexOf(flow);
    if (index >= 0) openFlows.splice(index, 1);
    void enqueue(saveOpenFlow);
    crashlytics.log(`closed ${name}`);
  };
}

/**
 * Run a task that leaves the app and comes back with a result — the photo
 * picker, the phone's camera app, the file picker, a browser sign-in or
 * payment page. The marker is on disk before the app goes to the background.
 */
export async function withFlow<T>(name: string, task: () => Promise<T>, options: FlowOptions = {}): Promise<T> {
  const end = markFlow(name, options);
  // Never hold the picker up for long over a slow write.
  await Promise.race([writes, new Promise((resolve) => setTimeout(resolve, 300))]);
  try {
    return await task();
  } finally {
    end();
  }
}

type PreviousRun = {
  screen: string;
  flow: Flow | null;
  jsCrashAt: number;
  exitsCheckedAt: number;
};

/**
 * The phone closed the app during a sign-in or payment page, but finishing
 * that page opened the app again by the flow's return link, which carries on
 * from there (app/auth/callback.tsx, the billing screen): nothing was lost.
 */
const cameBackBy = (flow: Flow | null, launchUrl: string | null): boolean =>
  Boolean(flow?.returnUrl && launchUrl?.startsWith(flow.returnUrl));

const readPreviousRun = async (): Promise<PreviousRun> => {
  const entries = await AsyncStorage.multiGet([LAST_SCREEN_KEY, FLOW_KEY, FATAL_JS_CRASH_KEY, EXITS_CHECKED_KEY]);
  const value = (key: string) => entries.find(([entryKey]) => entryKey === key)?.[1] ?? null;
  await AsyncStorage.multiRemove([FLOW_KEY, FATAL_JS_CRASH_KEY]);
  return {
    screen: value(LAST_SCREEN_KEY) ?? '',
    flow: parseFlow(value(FLOW_KEY)),
    jsCrashAt: Number(value(FATAL_JS_CRASH_KEY)) || 0,
    exitsCheckedAt: Number(value(EXITS_CHECKED_KEY)) || 0,
  };
};

const report = (
  kind: 'native_crash' | 'app_not_responding' | 'app_closed',
  message: string,
  run: { screen: string; flow: Flow | null },
  context: Record<string, string>,
) => {
  const screen = run.flow?.screen || run.screen;
  reportError(kind, message, {
    location: run.flow?.name ?? (screen || undefined),
    url: screen || undefined,
    context: {
      ...(screen ? { screen } : { screen: 'unknown' }),
      ...(run.flow ? { flow: run.flow.name } : {}),
      ...context,
    },
  });
};

/** Android's reasons for closing AccountE that are worth a report. */
const describeExit = (exit: AppExit): { kind: 'native_crash' | 'app_not_responding' | 'app_closed'; reason: string } | null => {
  switch (exit.reason) {
    case 'crash':
      return { kind: 'native_crash', reason: 'crash (Java/Kotlin)' };
    case 'crash_native':
      return { kind: 'native_crash', reason: 'crash (native C/C++)' };
    case 'initialization_failure':
      return { kind: 'native_crash', reason: 'failed to start' };
    case 'anr':
      return { kind: 'app_not_responding', reason: 'not responding' };
    case 'low_memory':
      return { kind: 'app_closed', reason: 'low memory' };
    case 'excessive_resource_usage':
      return { kind: 'app_closed', reason: 'used too much memory or battery' };
    case 'signaled':
      // Phones that can't tell low-memory kills apart report them as SIGKILL.
      return exit.status === 9 && !exit.lowMemoryReportSupported ? { kind: 'app_closed', reason: 'closed by the system' } : null;
    default:
      return null; // Swiped away, force-stopped, updated, permission changed…
  }
};

/** Android 11+: report from the reasons Android recorded. */
const reportAndroidExits = (exits: AppExit[], previous: PreviousRun, launchUrl: string | null) => {
  exits.slice(0, MAX_EXITS).forEach((exit, index) => {
    const found = describeExit(exit);
    if (!found) return;

    // Only the newest exit is the run whose screen and flow we know.
    const isLastRun = index === 0;
    const flow =
      isLastRun && previous.flow && exit.timestamp >= previous.flow.at && exit.timestamp - previous.flow.at < FLOW_WINDOW_MS
        ? previous.flow
        : null;
    const run = { screen: isLastRun ? previous.screen : '', flow };
    const memory: Record<string, string> = exit.pssKb > 0 ? { memory: `${Math.round(exit.pssKb / 1024)} MB` } : {};

    if (found.kind === 'native_crash') {
      // A JS crash ends as a Java crash too; errorReporter already sent it.
      if (exit.reason === 'crash' && previous.jsCrashAt && Math.abs(exit.timestamp - previous.jsCrashAt) < 60_000) return;
      report('native_crash', `The app crashed${onScreen(run.flow?.screen || run.screen)}`, run, {
        reason: found.reason,
        ...memory,
      });
      return;
    }

    if (found.kind === 'app_not_responding') {
      report('app_not_responding', `The app froze and Android closed it${onScreen(run.screen)}`, run, {
        reason: found.reason,
      });
      return;
    }

    // A closed app is only a problem if the person was using it or coming back to it.
    if (flow) {
      if (cameBackBy(flow, launchUrl)) return;
      report('app_closed', `Android closed the app while the ${flow.name} was open`, run, {
        reason: found.reason,
        away: duration(exit.timestamp - flow.at),
        ...memory,
      });
    } else if (exit.importance <= IMPORTANCE_VISIBLE) {
      report('app_closed', `Android closed the app while it was in use${onScreen(run.screen)}`, run, {
        reason: found.reason,
        ...memory,
      });
    }
  });
};

const checkPreviousRun = async (previous: PreviousRun): Promise<void> => {
  const crashed = await crashlytics.didCrashLastTime();
  const launchUrl = await Linking.getInitialURL().catch(() => null);
  const flowStillOpen = previous.flow && Date.now() - previous.flow.at < FLOW_WINDOW_MS ? previous.flow : null;

  if (isExitReasonReaderAvailable()) {
    const now = Date.now();
    await AsyncStorage.setItem(EXITS_CHECKED_KEY, String(now)).catch(() => undefined);
    // The first run with the reader only sets the start line, so history
    // from before the update isn't reported.
    const exits = previous.exitsCheckedAt ? await getAppExits(previous.exitsCheckedAt, 10) : [];
    if (exits.length > 0) {
      reportAndroidExits(exits, previous, launchUrl);
      return;
    }
  }

  // iOS, Android before 11, or no exit recorded: Crashlytics + the flow marker.
  const run = { screen: previous.screen, flow: flowStillOpen };
  if (crashed && !previous.jsCrashAt) {
    report('native_crash', `The app crashed${onScreen(flowStillOpen?.screen || previous.screen)}`, run, {
      reason: 'crash',
    });
  } else if (!crashed && flowStillOpen && !cameBackBy(flowStillOpen, launchUrl)) {
    report('app_closed', `The app was closed while the ${flowStillOpen.name} was open`, run, {
      reason: 'unknown',
      away: duration(Date.now() - flowStillOpen.at),
    });
  }
}

/**
 * Check how the previous run ended. Call once at start-up, after
 * installErrorReporting() and crashlytics.init().
 */
export function startAppExitMonitor(): void {
  if (started) return;
  started = true;

  const read = readPreviousRun().catch(() => null);
  writes = read.then(() => undefined);

  read
    .then((previous) => (previous ? checkPreviousRun(previous) : undefined))
    .catch(() => undefined);
}
