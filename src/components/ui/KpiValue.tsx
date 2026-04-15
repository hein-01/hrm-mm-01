import React from 'react';
import { formatCurrency, formatCurrencyCompact, formatHours, formatPercent } from '../../utils/formatters';

interface KpiValueProps {
  value: number;
  type: 'currency' | 'hours' | 'percent';
  className?: string;
  showFullOnHover?: boolean;
}

export const KpiValue: React.FC<KpiValueProps> = ({
  value,
  type,
  className = '',
  showFullOnHover = true
}) => {
  const getDisplayValue = () => {
    switch (type) {
      case 'currency':
        return formatCurrencyCompact(value);
      case 'hours':
        return formatHours(value);
      case 'percent':
        return formatPercent(value);
      default:
        return value.toString();
    }
  };

  const getFullValue = () => {
    switch (type) {
      case 'currency':
        return formatCurrency(value, 'full');
      case 'hours':
        return `${value.toFixed(2)} hours`;
      case 'percent':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  return (
    <span
      className={className}
      title={showFullOnHover ? getFullValue() : undefined}
    >
      {getDisplayValue()}
    </span>
  );
};

export default KpiValue;
