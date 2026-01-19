interface ViewModeToggleProps {
  is3D: boolean;
  setIs3D: (next: boolean) => void;
  disabled?: boolean;
}

const ViewModeToggle = ({ is3D, setIs3D, disabled }: ViewModeToggleProps) => {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIs3D(false)}
        className={`px-3 py-1 rounded text-sm font-semibold border ${
          !is3D ? 'bg-primary text-text-inverted border-primary' : 'bg-surface-overlay text-text-base border-border'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110'}`}
      >
        2D
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIs3D(true)}
        className={`px-3 py-1 rounded text-sm font-semibold border ${
          is3D ? 'bg-primary text-text-inverted border-primary' : 'bg-surface-overlay text-text-base border-border'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110'}`}
      >
        3D
      </button>
    </div>
  );
};

export default ViewModeToggle;
