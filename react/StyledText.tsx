import React, { useMemo } from "react";
import { TextStyler, RuleType } from "styled-text";

interface Props {
  text: string;
  config: RuleType<React.ReactNode>[];
  multiline?: boolean;
}

export const StyledText = ({ text, config, multiline = false }: Props) => {
  const styler = useMemo(() => new TextStyler<React.ReactNode>(config), [config]);
  const nodes = styler.processText(text, multiline);
  return <>{nodes}</>;
};
