import React, { createContext, useContext, useEffect, useRef } from "react";
import { ScrollView, TextInput, View } from "react-native";

export const SopEditorNavigation = createContext<{
  target: { id: string } | null;
  scrollRef: React.RefObject<ScrollView | null>;
} | null>(null);

/** Measure against the scroll content so expanding checks cannot stale a saved offset. */
export function SopEditorAnchor({
  id,
  children,
  focusRef,
}: {
  id?: string;
  children: React.ReactNode;
  focusRef?: React.RefObject<TextInput | null>;
}) {
  const navigation = useContext(SopEditorNavigation);
  const ref = useRef<View>(null);
  const reveal = () => {
    const scroll = navigation?.scrollRef.current;
    if (!id || navigation?.target?.id !== id || !scroll || !ref.current) return;
    ref.current.measureLayout(
      scroll.getInnerViewNode(),
      (_x, y) => {
        scroll.scrollTo({ y: Math.max(0, y - 24), animated: false });
        focusRef?.current?.focus();
      },
      () => undefined,
    );
  };
  useEffect(reveal, [id, navigation?.target, navigation?.scrollRef, focusRef]); // The request changes even for the same field.
  return (
    <View ref={ref} collapsable={false} onLayout={reveal}>
      {children}
    </View>
  );
}
