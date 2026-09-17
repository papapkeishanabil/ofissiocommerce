export interface ConnectorPoint {
  x: number;
  y: number;
}

interface ConnectorOptions {
  /** Radius of the numbered marker in the same coordinate unit as the points. */
  markerRadius: number;
  /** Short horizontal segment leaving the garment anchor. */
  maxAnchorStem: number;
  /** Short horizontal segment entering the numbered marker. */
  maxMarkerStem: number;
  markerGap?: number;
}

/**
 * Creates the compact four-point route used by the inspiration annotations:
 * garment anchor -> short horizontal -> diagonal -> short horizontal -> marker.
 * The final point stops before the marker centre so the line meets its edge.
 */
export function buildBentConnector(
  anchor: ConnectorPoint,
  marker: ConnectorPoint,
  options: ConnectorOptions,
) {
  const direction = marker.x >= anchor.x ? 1 : -1;
  const markerEdgeX =
    marker.x - direction * (options.markerRadius + (options.markerGap ?? 0));
  const available = Math.abs(markerEdgeX - anchor.x);

  if (available <= 0.5) {
    return `${anchor.x},${anchor.y} ${markerEdgeX},${marker.y}`;
  }

  const anchorStem = Math.min(options.maxAnchorStem, available * 0.24);
  const markerStem = Math.min(options.maxMarkerStem, available * 0.2);
  const firstBendX = anchor.x + direction * anchorStem;
  const secondBendX = markerEdgeX - direction * markerStem;
  const bendsCross =
    direction > 0 ? firstBendX >= secondBendX : firstBendX <= secondBendX;

  if (bendsCross) {
    const middleX = anchor.x + direction * available * 0.5;
    return `${anchor.x},${anchor.y} ${middleX},${anchor.y} ${markerEdgeX},${marker.y}`;
  }

  return `${anchor.x},${anchor.y} ${firstBendX},${anchor.y} ${secondBendX},${marker.y} ${markerEdgeX},${marker.y}`;
}
