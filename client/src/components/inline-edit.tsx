import clsx from 'clsx';
import { useCallback, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { assert } from 'src/utils';

import { Input, Textarea } from './input';

type InlineEditProps = {
  value: string;
  onSubmit: (value: string) => Promise<void>;
  label: string;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  children: React.ReactNode;
};

export function InlineEdit({
  value,
  onSubmit,
  label,
  required,
  multiline,
  placeholder,
  className,
  children,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    const action = async (formData: FormData) => {
      try {
        const edited = formData.get('value');

        assert(typeof edited === 'string');

        if (value.trim() !== edited.trim()) {
          await onSubmit(edited.trim());
        }

        setEditing(false);
      } catch {}
    };

    return (
      <form action={action}>
        <InlineEditField
          value={value}
          label={label}
          multiline={multiline}
          required={required}
          placeholder={placeholder}
          onCancel={() => setEditing(false)}
          className={className}
        />
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={clsx('text-start', !multiline && 'max-w-fit', className)}
    >
      {children}
    </button>
  );
}

export function NoValue({ children }: { children: React.ReactNode }) {
  return <div className="text-dim text-sm font-medium">{children}</div>;
}

function InlineEditField({
  value,
  label,
  required,
  multiline,
  placeholder,
  onCancel,
  className,
}: Omit<InlineEditProps, 'onSubmit' | 'children'> & {
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();

  const ref = useCallback((ref: HTMLInputElement & HTMLTextAreaElement) => {
    if (ref) {
      ref.setSelectionRange(ref.value.length, ref.value.length);
    }
  }, []);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }

    if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement> = (event) => {
    event.currentTarget.form?.requestSubmit();
  };

  const props = {
    ref,
    required,
    placeholder,
    autoFocus: true,
    defaultValue: value,
    disabled: pending,
    name: 'value',
    'aria-label': label,
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    className,
  };

  if (multiline) {
    return <Textarea {...props} rows={3} />;
  }

  return <Input {...props} />;
}
