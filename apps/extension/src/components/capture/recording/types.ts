/** Marker types that can appear on the recording timeline. */
export type MarkerType =
  | 'error'
  | 'warning'
  | 'network_fail'
  | 'network_slow'
  | 'navigation'
  | 'marker'
  | 'user_action';

export interface RecordingMarker {
  id: string;
  timestampMs: number;
  type: MarkerType;
  label?: string;
}
