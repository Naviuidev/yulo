import { classNames } from '../../utils/helpers';

export default function ColorSwatch({ colors, selected, onSelect }) {
  return (
    <div className="d-flex gap-2 flex-wrap">
      {colors.map((color) => (
        <button
          key={color.name ?? color}
          type="button"
          className={classNames('color-swatch', selected === (color.name ?? color) && 'active')}
          style={{ background: color.hex ?? color }}
          title={color.name ?? color}
          onClick={() => onSelect(color.name ?? color)}
          aria-label={color.name ?? color}
        />
      ))}
    </div>
  );
}
