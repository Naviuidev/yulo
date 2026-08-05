import { classNames } from '../../utils/helpers';

export default function SizeSelector({ sizes, selected, onSelect, unavailable = [] }) {
  return (
    <div className="d-flex gap-2 flex-wrap">
      {sizes.map((size) => {
        const isUnavailable = unavailable.includes(size);
        return (
          <button
            key={size}
            type="button"
            className={classNames('size-option', selected === size && 'active')}
            disabled={isUnavailable}
            onClick={() => onSelect(size)}
          >
            {size}
          </button>
        );
      })}
    </div>
  );
}
