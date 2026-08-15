export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  kibiCompatibility: string;
  tags?: string[];
  resources?: string[];
}
export interface SkillBundle {
  manifest: SkillManifest;
  body: string;
  rootDir: string;
}
