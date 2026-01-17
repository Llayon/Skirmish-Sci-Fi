
import React from 'react';
import { ParticipantStatus, Position, BattleCellParticipantViewModel } from '../../types';
import { User, Bot, Skull, Shield, Package, Search, Trophy, Crosshair } from 'lucide-react';
import { useTranslation } from '../../i18n';
import Tooltip from '../ui/Tooltip';

/**
 * Props for the BattleCell component.
 * @property {number} x - The x-coordinate of the cell.
 * @property {number} y - The y-coordinate of the cell.
 * @property {() => void} onCellClick - Callback function for when the cell is clicked.
 * @property {(pos: Position | null) => void} onHover - Callback for when the mouse enters or leaves the cell.
 * @property {React.CSSProperties} cellStyle - CSS styles for the cell background (e.g., terrain textures).
 * @property {string} cellBorder - CSS class for the cell border color.
 * @property {React.ReactNode | null} cellIcon - An optional icon to display on the cell (e.g., for terrain features).
 * @property {string} [highlightOverlayClass] - CSS class for a highlight overlay (e.g., for valid move targets).
 * @property {string} [pathOverlayClass] - CSS class for a pathing overlay.
 * @property {boolean} isClickable - Whether the cell should have a pointer cursor and accept clicks.
 * @property {boolean} isPathEnd - Whether this cell is the end of a hovered movement path.
 * @property {boolean} isReachableMoveCell - Whether this cell is within the current character's movement range.
 * @property {boolean} providesCoverForMove - Whether moving to this cell would grant cover from the nearest threat.
 * @property {BattleCellParticipantViewModel} [participant] - The participant occupying this cell, if any.
 * @property {boolean} isItemOnGround - Whether a mission item is on this cell.
 * @property {boolean} isSearched - Whether this cell has already been searched for a mission objective.
 * @property {boolean} isNotableSight - Whether a notable sight is on this cell.
 * @property {number} [pathCost] - The movement cost to reach this cell, displayed if it's a path end.
 */
type BattleCellProps = {
  x: number;
  y: number;
  onCellClick: () => void;
  onHover: (pos: Position | null) => void;
  cellStyle: React.CSSProperties;
  cellBorder: string;
  cellIcon: React.ReactNode | null;
  highlightOverlayClass?: string;
  pathOverlayClass?: string;
  isClickable: boolean;
  isPathEnd: boolean;
  isReachableMoveCell: boolean;
  providesCoverForMove: boolean;
  participant?: BattleCellParticipantViewModel;
  isItemOnGround: boolean;
  isSearched: boolean;
  isNotableSight?: boolean;
  pathCost?: number;
};

/**
 * Represents a single cell on the tactical battle grid.
 * It is responsible for displaying terrain, participants, and various UI overlays (highlights, paths).
 * This component is memoized for performance, as many cells are rendered.
 * @param {BattleCellProps} props - The component props.
 */
const BattleCell: React.FC<BattleCellProps> = ({
  x, y, onCellClick, onHover, cellStyle, cellBorder, cellIcon, highlightOverlayClass, pathOverlayClass, isClickable, isPathEnd,
  isReachableMoveCell, providesCoverForMove, participant, isItemOnGround, isSearched, isNotableSight, pathCost
}) => {
  const { t } = useTranslation();
  const pos = { x, y };

  return (
    <div
      style={cellStyle}
      className={`border ${cellBorder} flex items-center justify-center relative aspect-square transition-colors duration-200 ${isClickable || !!participant ? 'cursor-pointer' : ''}`}
      onClick={onCellClick}
      onMouseEnter={() => onHover(pos)}
      onMouseLeave={() => onHover(null)}
    >
      {highlightOverlayClass && <div className={`absolute inset-0 ${highlightOverlayClass} transition-colors duration-200 pointer-events-none`}></div>}
      {pathOverlayClass && <div className={`absolute inset-0 ${pathOverlayClass} transition-colors duration-200 pointer-events-none`}></div>}

      <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>{cellIcon}</div>
      {isSearched && (
        <div className='absolute inset-0 bg-surface-base/50 flex items-center justify-center pointer-events-none'>
          <Search size={16} className='text-text-muted' />
        </div>
      )}
      {isItemOnGround && (
        <div className='absolute z-10 animate-pulse'>
          <Package size={20} className='text-warning drop-shadow-lg' />
        </div>
      )}
      {isNotableSight && (
        <div className='absolute z-10 animate-pulse'>
          <Trophy size={20} className='text-accent drop-shadow-lg' />
        </div>
      )}
      {isReachableMoveCell && providesCoverForMove && (
        <div className='absolute bottom-1 right-1 pointer-events-none' title='Provides Cover'>
          <Shield size={16} className='text-info/80 drop-shadow-lg' />
        </div>
      )}
      {participant && (
        <div title={participant.name} className={`w-3/4 h-3/4 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative z-10 shadow-md
              ${!participant.isOpponent ? 'bg-primary border-primary/70' : 'bg-danger border-danger/70'}
              ${participant.isSelected ? 'ring-4 ring-warning scale-110 shadow-lg' : 'scale-100'}
              ${participant.isActive && !participant.isAnimating ? 'animate-pulse ring-2 ring-text-inverted' : ''}
              ${participant.isPending ? 'ring-4 ring-warning/80 animate-pulse' : ''}
              ${participant.status === 'casualty' ? 'opacity-40 bg-secondary' : ''}
              ${participant.status === 'stunned' ? 'opacity-70 animate-pulse border-warning' : ''}
              ${participant.status === 'dazed' ? 'opacity-70 ring-2 ring-accent animate-pulse' : ''}
              ${participant.isAnimating ? 'opacity-0' : ''}
            `}>
          {participant.status === 'casualty' ? <Skull size={16} /> : (participant.isOpponent ? <Bot size={16} /> : <User size={16} />)}
          {participant.isItemCarrier && (
            <div className='absolute -top-1.5 -left-1.5 bg-warning rounded-full p-0.5 shadow-lg'>
              <Package size={12} className='text-text-inverted' />
            </div>
          )}
          {participant.isMissionTarget && (
            <div className='absolute -top-1.5 -right-1.5 bg-danger rounded-full p-0.5 shadow-lg' title={t('tooltips.missionTarget')}>
              <Crosshair size={12} className='text-text-inverted' />
            </div>
          )}
          {participant.stunTokens > 0 && <span className='absolute -bottom-1 -right-1 bg-warning text-surface-base text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center'>{participant.stunTokens}</span>}
          {participant.hasCoverFromAttacker && (
            <Shield size={12} className='absolute -top-1 -left-1 text-text-inverted bg-info rounded-full p-0.5' />
          )}
          {participant.isUnique && (
            <Tooltip content={t('tooltips.uniqueIndividual')}>
                <div className='absolute -bottom-1 -left-1 bg-accent rounded-full p-0.5 shadow-lg'>
                    <Trophy size={12} className='text-text-inverted' />
                </div>
            </Tooltip>
          )}
        </div>
      )}
      {isPathEnd && pathCost !== undefined && (
        <span className='absolute text-text-inverted font-bold text-lg z-20 drop-shadow-lg pointer-events-none'>
          {pathCost}
        </span>
      )}
    </div>
  );
};

const areEqual = (prevProps: BattleCellProps, nextProps: BattleCellProps): boolean => {
  // Compare primitive props
  const primitiveKeys: (keyof BattleCellProps)[] = [
    'x', 'y', 'cellBorder', 'isClickable', 'isPathEnd', 'highlightOverlayClass', 'pathOverlayClass',
    'isReachableMoveCell', 'providesCoverForMove', 'isItemOnGround', 'isSearched', 'pathCost', 'isNotableSight'
  ];
  for (const key of primitiveKeys) {
    if (prevProps[key] !== nextProps[key]) return false;
  }

  // Shallow compare style object
  if (Object.keys(prevProps.cellStyle).length !== Object.keys(nextProps.cellStyle).length) return false;
  for (const key in prevProps.cellStyle) {
    if (prevProps.cellStyle[key as keyof typeof prevProps.cellStyle] !== nextProps.cellStyle[key as keyof typeof nextProps.cellStyle]) {
      return false;
    }
  }

  // Shallow compare the participant view model object
  const prevP = prevProps.participant;
  const nextP = nextProps.participant;
  if (!!prevP !== !!nextP) return false; // one has a participant and the other doesn't
  if (prevP && nextP) {
    if (Object.keys(prevP).length !== Object.keys(nextP).length) return false;
    for (const key in prevP) {
      if (prevP[key as keyof typeof prevP] !== nextP[key as keyof typeof nextP]) {
        return false;
      }
    }
  }

  // We assume `cellIcon`, `onCellClick`, `onHover` are stable and don't need comparison
  return true;
}


export default React.memo(BattleCell, areEqual);
