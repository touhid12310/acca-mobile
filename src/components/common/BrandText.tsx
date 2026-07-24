import React from "react";
import { StyleSheet, Text } from "react-native";

const BRAND_NAME = "AccountE";

type BrandTextProps = {
  children: string;
};

export function BrandText({ children }: BrandTextProps) {
  const parts = children.split(BRAND_NAME);

  return (
    <>
      {parts.map((part, index) => (
        <React.Fragment key={`${part}-${index}`}>
          {index > 0 && (
            <>
              Account<Text style={styles.finalE}>E</Text>
            </>
          )}
          {part}
        </React.Fragment>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  finalE: {
    color: "#016df7",
  },
});
