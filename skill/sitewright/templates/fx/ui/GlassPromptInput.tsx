'use client';
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { PROMPT_DEFAULT_PARAMS } from './_tg-engine';
import { useGlass, type GlassOpticsProps } from './_tg-use';
import { GlassStage } from './_tg-stage';

export interface GlassPromptInputProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  /** Accessible name of the text area (default "Prompt"). */
  label?: string;
  onMentionClick?: () => void;
  /** Label of the first mode pill (it cycles Agent, Plan, Ask unless onAgentClick is given). */
  agentLabel?: string;
  onAgentClick?: () => void;
  /** An extra pill. */
  modeLabel?: string;
  onModeClick?: () => void;
  className?: string;
  optics?: GlassOpticsProps;
}

const MODES = [{ key: 'agent', hint: '' }, { key: 'plan', hint: 'Plan architecture, @ to mention, / for actions' }, { key: 'ask', hint: 'Ask a question, @ to mention, / for actions' }];

/** An AI prompt box on a glass pane: auto-growing text area (Enter sends, Shift+Enter adds a line), an add-context button, a mode pill and a send button. */
export default function GlassPromptInput({ value, defaultValue = '', placeholder = 'Ask anything, @ to mention, / for actions', label = 'Prompt', onChange, onSubmit, onMentionClick, agentLabel = 'Agent', onAgentClick, modeLabel, onModeClick, className = '', optics }: GlassPromptInputProps) {
  const { rootRef, canvasRef, dataGlass } = useGlass<HTMLDivElement>({ defaults: PROMPT_DEFAULT_PARAMS, optics, radius: 'css' });
  const area = useRef<HTMLTextAreaElement | null>(null);
  const [inner, setInner] = useState(defaultValue);
  const text = value !== undefined ? value : inner;
  const [mode, setMode] = useState(0);
  const names = [agentLabel, 'Plan', 'Ask'];
  const hint = MODES[mode]!.hint || placeholder;

  const grow = () => {
    const t = area.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight, parseFloat(getComputedStyle(t).maxHeight) || 160)}px`;
  };
  const change = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (value === undefined) setInner(e.target.value);
    onChange?.(e.target.value);
    grow();
  };
  const send = () => {
    if (!text.trim()) return;
    onSubmit?.(text);
    if (value === undefined) { setInner(''); requestAnimationFrame(grow); }
  };
  const key = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  return (
    <div ref={rootRef} data-glass={dataGlass} className={`ui-glass ui-glass-pane ui-glass-prompt ${className}`.trim()}>
      <canvas ref={canvasRef} className="ui-glass-canvas" aria-hidden="true" />
      <div className="ui-glass-prompt-body">
        <textarea ref={area} rows={1} value={text} onChange={change} onKeyDown={key} placeholder={hint} aria-label={label} className="ui-glass-prompt-text" />
      </div>
      <div className="ui-glass-prompt-bar">
        <div className="ui-glass-prompt-pills">
          <button type="button" className="ui-glass-chip" aria-label="Add context" onClick={() => (onMentionClick ? onMentionClick() : area.current?.focus())}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M12 5v14" /></svg>
          </button>
          <button type="button" className="ui-glass-chip" data-pill="" aria-label={`Mode: ${names[mode]}. Press to change.`} onClick={() => (onAgentClick ? onAgentClick() : setMode((m) => (m + 1) % MODES.length))}>{names[mode]}</button>
          {modeLabel && <button type="button" className="ui-glass-chip" data-pill="" onClick={onModeClick}>{modeLabel}</button>}
        </div>
        <button type="button" className="ui-glass-chip" data-send="" aria-label="Send prompt" disabled={!text.trim()} onClick={send}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 7-7 7 7M12 19V5" /></svg>
        </button>
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <GlassStage>
      <GlassPromptInput defaultValue="Summarise this week's feedback" optics={{ refraction: 40, thickness: 40, bevelWidth: 10, frost: 20, sheen: 40, rim: 40 }} />
    </GlassStage>
  );
}
