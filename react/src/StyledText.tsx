import React, { useMemo } from "react";
import { TextStyler, RuleType } from "@brownmotie/styled-text";

interface Props {
  text: string;
  config: RuleType<React.ReactNode>[];
  multiline?: boolean;
}

export const StyledText = ({ text, config, multiline = false }: Props) => {
  const styler = useMemo(() => new TextStyler<React.ReactNode>(config), [config]);
  // We want htmlEscape to be false because React will do the escaping for us already
  const nodes = styler.processText(text, multiline, false);
  return <>{nodes}</>;
};
