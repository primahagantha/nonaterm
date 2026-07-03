export type LayoutPreset = '1' | '2' | '4' | '6' | '9';

export type WorkspacePane = {
  id: string;
  title: string;
  cwd: string;
  startupCommand: string;
  shell?: string;
};

export type Workspace = {
  id: string;
  name: string;
  accentColor: string;
  fontFamily?: string;
  layoutPreset: LayoutPreset;
  panes: WorkspacePane[];
};
