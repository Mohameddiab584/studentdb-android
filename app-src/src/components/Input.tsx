type Props = {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  className?: string;
  readOnly?: boolean;
};

export function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
  maxLength,
  className = '',
  readOnly,
}: Props) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        readOnly={readOnly}
        className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all outline-none ${
          readOnly
            ? 'border-gray-200 bg-gray-50 text-gray-600'
            : 'border-gray-300 bg-white text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
        }`}
      />
    </div>
  );
}
