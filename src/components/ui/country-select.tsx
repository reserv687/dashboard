import Select, { components } from 'react-select';
import { Country, countries } from '@/lib/countries';

const Option = ({ ...props }: any) => {
  const { flag, label, code } = props.data;
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2 text-sm">
        <span>{flag}</span>
        <span>{label}</span>
        <span className="text-muted-foreground">{code}</span>
      </div>
    </components.Option>
  );
};

const SingleValue = ({ ...props }: any) => {
  const { flag, code } = props.data;
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center gap-2 text-sm">
        <span>{flag}</span>
        <span className="text-muted-foreground">{code}</span>
      </div>
    </components.SingleValue>
  );
};

interface CountrySelectProps {
  value: Country;
  onChange: (country: Country) => void;
}

export function CountrySelect({ value, onChange }: CountrySelectProps) {
  return (
    <Select
      options={countries}
      value={value}
      onChange={(newValue) => onChange(newValue as Country)}
      components={{ Option, SingleValue }}
      isSearchable={false}
      styles={{
        control: (base) => ({
          ...base,
          border: '1px solid hsl(var(--input))',
          borderRadius: 'calc(var(--radius) - 2px)',
          backgroundColor: 'hsl(var(--background))',
          boxShadow: 'none',
          '&:hover': {
            borderColor: 'hsl(var(--input))',
          },
        }),
        menu: (base) => ({
          ...base,
          backgroundColor: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }),
        menuList: (base) => ({
          ...base,
          padding: 0,
        }),
        option: (base, state) => ({
          ...base,
          padding: '8px 12px',
          cursor: 'pointer',
          backgroundColor: state.isFocused 
            ? 'hsl(var(--accent))' 
            : 'transparent',
          color: 'hsl(var(--foreground))',
          '&:active': {
            backgroundColor: 'hsl(var(--accent))',
          },
        }),
        singleValue: (base) => ({
          ...base,
          color: 'hsl(var(--foreground))',
        }),
      }}
    />
  );
}
