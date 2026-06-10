import Icon from "@/app/components/Icon/Icon";
import { InputField } from "@/app/components/InputField";

export function ProfileField({
  icon,
  label,
  value,
  isEditing,
  onChange,
  required = false,
}: {
  icon: string;
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.9px] text-content-subtle">
        {label}
      </span>
      {isEditing ? (
        <InputField
          label={label}
          showLabel={false}
          value={value}
          state="active"
          onChange={onChange}
          required={required}
          inputMinHeight={40}
          inputFontSize={12}
          className="tracking-normal"
          activeBackgroundClass="bg-surface"
        />
      ) : (
        <span className="flex min-h-5 items-center gap-2 text-xs text-content">
          <Icon icon={icon} size={14} className="text-content-subtle" />
          {value || "-"}
        </span>
      )}
    </label>
  );
}

export function ReadOnlyProfileField({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.9px] text-content-subtle">
        {label}
      </div>
      <div className="flex min-h-5 items-center gap-2 text-xs text-content">
        <Icon icon={icon} size={14} className="text-content-subtle" />
        {value}
      </div>
    </div>
  );
}

export function ProfileSegmentedField({
  icon,
  label,
  value,
  isEditing,
  options,
  onChange,
}: {
  icon: string;
  label: string;
  value: string;
  isEditing: boolean;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "-";

  return (
    <label className="block">
      <span className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.9px] text-content-subtle">
        {label}
      </span>
      {isEditing ? (
        <div className="grid h-10 grid-cols-3 gap-1 rounded-[3px] bg-surface-muted p-1">
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={[
                  "inline-flex items-center justify-center gap-1.5 rounded-xs px-2 text-[11px] font-bold transition",
                  active
                    ? "border border-dark-blue bg-dark-blue text-white shadow-[0_3px_8px_rgba(21,30,102,0.18)]"
                    : "border border-border bg-surface/45 text-content-muted hover:bg-surface hover:text-dark-blue",
                ].join(" ")}
                onClick={() => onChange(option.value)}
              >
                {option.value ? (
                  <Icon
                    icon={option.value === "PEREMPUAN" ? "female" : "male"}
                    size={14}
                  />
                ) : null}
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <span className="flex min-h-5 items-center gap-2 text-xs text-content">
          <Icon icon={icon} size={14} className="text-content-subtle" />
          {selectedLabel}
        </span>
      )}
    </label>
  );
}

export function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[8px] font-extrabold uppercase tracking-[0.9px] text-content-subtle">
        {label}
      </span>
      <InputField
        label={label}
        showLabel={false}
        value={value}
        type="password"
        state="active"
        onChange={onChange}
        required
        inputMinHeight={40}
        inputFontSize={12}
        className="tracking-normal"
        activeBackgroundClass="bg-surface"
      />
    </label>
  );
}
