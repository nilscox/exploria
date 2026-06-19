import { Trans } from '@lingui/react/macro';

import { Select, SelectItem } from 'src/components/select';

export function ModelSelector({
  models,
  value,
  onChange,
}: {
  models: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange} renderValue={() => value}>
      {models.map((model) => (
        <SelectItem key={model} value={model}>
          <div className="col gap-0.5">
            <span>{model}</span>
            <span className="text-dim text-xs">
              {providers.find(({ re }) => re.exec(model))?.label ?? <Trans>Unknown provider</Trans>}
            </span>
          </div>
        </SelectItem>
      ))}
    </Select>
  );
}

// Thanks!
// https://codeberg.org/mammouth-ai/mammouth-model-explorer/src/branch/pages/index.html#L378
const providers = [
  { label: 'Anthropic', re: /^claude|^mythos/i },
  { label: 'Google', re: /^gemini|^palm|^bison|^gecko/i },
  { label: 'Moonshot AI', re: /^kimi/i },
  { label: 'Mistral', re: /stral/i },
  { label: 'xAI', re: /^grok/i },
  { label: 'Meta', re: /^llama|^meta-llama|^muse|^avocado/i },
  { label: 'Z.ai', re: /^glm|^chatglm/i },
  { label: 'Alibaba', re: /^qwen/i },
  { label: 'DeepSeek', re: /^deepseek/i },
  { label: 'Cohere', re: /^command|^cohere/i },
  { label: 'NVIDIA', re: /^nemotron|^nvidia/i },
  { label: '01.AI', re: /^yi-/i },
  { label: 'Perplexity', re: /^pplx|^sonar/i },
  { label: 'OpenAI', re: /^(gpt|o\d|chatgpt|dall-e|whisper|tts|text-embedding|babbage|davinci)/i },
];
