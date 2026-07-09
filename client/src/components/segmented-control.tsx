import { cva } from 'class-variance-authority';

import { fieldProps } from './field';

export function SegmentedControl<Value extends string>({
  value,
  onChange,
  options,
}: {
  value: Value;
  onChange: (value: Value) => void;
  options: { value: Value; label: React.ReactNode }[];
}) {
  return (
    <div {...fieldProps()} className="row bg-accent/50 gap-1 rounded-lg p-1">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={selected}
            onClick={() => onChange(option.value)}
            className={optionVariants({ selected })}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const optionVariants = cva(
  'flex-1 cursor-pointer rounded-md px-2 py-1 text-sm font-medium transition-colors disabled:cursor-default',
  {
    variants: {
      selected: {
        true: 'bg-neutral text-primary shadow-sm',
        false: 'text-dim hover:bg-neutral/50',
      },
    },
  },
);
