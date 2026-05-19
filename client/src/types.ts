export interface Entry {
  id: number;
  week_number: string;
  month_number: string;
  date: string;
  day_name: string;
  season: string;
  time_string: string;
  detail: string;
  place: string;
  activity: string;
  row_color: string | null;
  created_at: string;
  updated_at: string;
}

export type ColumnKey = 
  | 'week_number' 
  | 'month_number' 
  | 'date' 
  | 'day_name' 
  | 'season' 
  | 'time_string' 
  | 'detail' 
  | 'place' 
  | 'activity';

export const ROW_COLORS: Record<string, { bg: string; text: string; name: string }> = {
  none: { bg: 'transparent', text: 'inherit', name: 'None' },
  red: { bg: '#fee2e2', text: '#991b1b', name: 'Red' },
  yellow: { bg: '#fef9c3', text: '#854d0e', name: 'Yellow' },
  green: { bg: '#dcfce7', text: '#166534', name: 'Green' },
  blue: { bg: '#dbeafe', text: '#1e40af', name: 'Blue' },
  purple: { bg: '#f3e8ff', text: '#6b21a8', name: 'Purple' },
  orange: { bg: '#ffedd5', text: '#9a3412', name: 'Orange' },
};
