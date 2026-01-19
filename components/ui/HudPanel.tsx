import React from 'react';
import Card from './Card';
import Button from './Button';
import { ChevronDown, ChevronUp } from 'lucide-react';

type HudPanelProps = {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  expandLabel?: string;
  collapseLabel?: string;
  collapsedContent?: React.ReactNode;
  density?: 'compact' | 'normal';
  children: React.ReactNode;
  className?: string;
};

const HudPanel: React.FC<HudPanelProps> = ({
  title,
  collapsed,
  onToggle,
  expandLabel,
  collapseLabel,
  collapsedContent,
  density = 'normal',
  children,
  className,
}) => {
  return (
    <Card className={`hud-panel !p-0 ${className || ''}`}>
      <div className="flex justify-between items-center px-3 py-2 border-b border-border/50">
        <h4 className="font-bold text-text-base">{title}</h4>
        <Button
          variant="secondary"
          className="p-1 h-auto"
          aria-expanded={!collapsed}
          aria-label={collapsed ? expandLabel || 'Expand panel' : collapseLabel || 'Collapse panel'}
          onClick={onToggle}
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </Button>
      </div>
      {collapsed ? (
        collapsedContent ? (
          <div className="px-3 py-2 text-sm text-text-muted">
            {collapsedContent}
          </div>
        ) : null
      ) : (
        <div className={`px-3 py-2 ${density === 'compact' ? 'text-sm space-y-1' : 'space-y-2'}`}>
          {children}
        </div>
      )}
    </Card>
  );
};

export default HudPanel;
