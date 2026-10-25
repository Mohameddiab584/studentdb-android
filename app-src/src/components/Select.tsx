import { ChevronDown } from 'lucide-react';

type Option = { value: string; label: string };

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
};

export function Select({ label, value, onChange, options, placeholder = 'اختر...', required, className = '' }: Props) {
  const opts: Option[] = (options as (string | Option)[]).map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
