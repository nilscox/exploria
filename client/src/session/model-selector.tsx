import { Select, SelectItem } from 'src/components/select';

export function ModelSelector({
  name,
  value,
  onChange,
}: {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <Select
      name={name}
      value={value}
      onValueChange={(value) => value !== null && onChange?.(value)}
      renderValue={() => value}
    >
      {models.map(({ id, provider }) => (
        <SelectItem key={id} value={id}>
          <div className="col gap-0.5">
            <span>{id}</span>
            <span className="text-dim text-xs">{provider}</span>
          </div>
        </SelectItem>
      ))}
    </Select>
  );
}

// cspell:disable
const models = [
  { id: 'claude-opus-4-8', provider: 'Anthropic' },
  { id: 'claude-opus-4-7', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-6', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-5', provider: 'Anthropic' },
  { id: 'claude-haiku-4-5', provider: 'Anthropic' },
  { id: 'gpt-5.5', provider: 'OpenAI' },
  { id: 'gpt-5.4', provider: 'OpenAI' },
  { id: 'gpt-5.2', provider: 'OpenAI' },
  { id: 'gpt-5.1', provider: 'OpenAI' },
  { id: 'gpt-4.1', provider: 'OpenAI' },
  { id: 'gpt-4o', provider: 'OpenAI' },
  { id: 'gemini-2.5-pro', provider: 'Google' },
  { id: 'gemini-3.1-pro-preview', provider: 'Google' },
  { id: 'gemini-3.5-flash', provider: 'Google' },
  { id: 'gemini-3-flash-preview', provider: 'Google' },
  { id: 'gemini-2.5-flash', provider: 'Google' },
  { id: 'grok-4.3', provider: 'xAI' },
  { id: 'deepseek-v4-pro', provider: 'DeepSeek' },
  { id: 'deepseek-v4-flash', provider: 'DeepSeek' },
  { id: 'mistral-large-3', provider: 'Mistral' },
  { id: 'qwen3.7-max', provider: 'Alibaba' },
  { id: 'qwen3.5-397b-a17b', provider: 'Alibaba' },
];
// cspell:enabled
