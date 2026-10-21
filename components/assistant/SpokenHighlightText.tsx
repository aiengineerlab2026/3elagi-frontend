import React from "react";
import { StyleSheet, Text } from "react-native";

type Props = {
  words: string[];
  activeIndex: number;
  color: string;
  highlightColor: string;
  /** Only show words up to the active index (karaoke-style reveal). */
  revealProgressively?: boolean;
};

export function SpokenHighlightText({
  words,
  activeIndex,
  color,
  highlightColor,
  revealProgressively = false,
}: Props) {
  if (words.length === 0) return null;

  const visibleWords = revealProgressively
    ? words.slice(0, activeIndex + 1)
    : words;
  const visibleActiveIndex = revealProgressively
    ? visibleWords.length - 1
    : activeIndex;

  return (
    <Text style={styles.text}>
      {visibleWords.map((word, index) => {
        const active = index === visibleActiveIndex;
        return (
          <Text
            key={`${index}-${word}`}
            style={[
              styles.word,
              {
                color: active ? highlightColor : color,
                backgroundColor: active ? `${highlightColor}22` : "transparent",
                fontWeight: active ? "700" : "400",
              },
            ]}
          >
            {word}
            {index < visibleWords.length - 1 ? " " : ""}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 15, lineHeight: 22 },
  word: { fontSize: 15, lineHeight: 22 },
});
