import { default as React } from 'react';
import { RuleType } from '@brownmotie/styled-text';
interface Props {
    text: string;
    config: RuleType<React.ReactNode>[];
    multiline?: boolean;
}
export declare const StyledText: ({ text, config, multiline }: Props) => import("react/jsx-runtime").JSX.Element;
export {};
