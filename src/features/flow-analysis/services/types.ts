export interface TechniqueReference {
  name: string;
  description?: string;
  usage?: string;
}

export interface SecurityReference {
  url: string;
  description: string;
  source_name: string;
}

export interface BaseAttackTechnique {
  technique: string;
  name: string;
  description: string;
  tacticId?: string;
  tacticName?: string;
  commands?: string[];
  targets_assets?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
  tools?: TechniqueReference[];
  references?: SecurityReference[];
}

export interface CommandAndControlTechnique extends BaseAttackTechnique {
  infrastructure?: {
    name: string;
    description: string;
    type: string;
    ip?: string;
    domain?: string;
  }[];
}

export interface CollectionTechnique extends BaseAttackTechnique {
  dataTypes?: string[];
}

export interface ExfiltrationTechnique extends BaseAttackTechnique {
  destination?: string;
  dataSize?: string;
}

export interface ImpactTechnique extends BaseAttackTechnique {
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AssetDetails {
  os?: string;
  services?: string[];
}

export interface AttackAsset {
  name: string;
  description: string;
  role?: string;
  impact?: string;
  criticality?: 'low' | 'medium' | 'high' | 'critical';
  asset_type?: 'server' | 'network' | 'data' | 'user' | 'web-infrastructure';
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
  details?: AssetDetails;
  connects_to?: string[];
}

export interface AttackCondition {
  name: string;
  description: string;
  pattern?: string;
  operator?: 'AND' | 'OR';
  context?: string;
  enables_actions?: string[];
  on_success?: string[];
  on_failure?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface AttackOperator {
  name: string;
  operator: 'AND' | 'OR';
  description: string;
  input_conditions: string[];
  output_actions: string[];
  source_snippet?: string;
}

export interface Infrastructure {
  name: string;
  description: string;
  type: string;
  ip?: string;
  domain?: string;
  role?: string;
}

export interface Vulnerability {
  name: string;
  description: string;
  cve_id?: string;
  cvss_score?: number;
  affects_assets?: string[];
  exploited_by?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface AttackTool {
  name: string;
  description: string;
  tool_type: 'malware' | 'legitimate' | 'dual-use';
  used_by?: string[];
  targets_assets?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface AttackProcess {
  name: string;
  description: string;
  process_type: 'legitimate' | 'malicious' | 'modified';
  pid?: string;
  parent_process?: string;
  command_line?: string;
  affected_assets?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface AttackFile {
  name: string;
  description: string;
  file_type: 'executable' | 'document' | 'script' | 'configuration';
  path?: string;
  hash?: string;
  size?: string;
  deployed_to?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface ImageAnalysis {
  description: string;
  analysis: string;
  relevantTechniques?: string[];
}

export interface IPAddress {
  value: string;
  description: string;
  ip_type?: 'ipv4' | 'ipv6';
  location?: string;
  organization?: string;
  reputation?: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  used_by?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface Domain {
  value: string;
  description: string;
  domain_type?: 'fqdn' | 'subdomain' | 'tld';
  registrar?: string;
  creation_date?: string;
  reputation?: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  used_by?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface FileHash {
  value: string;
  hash_type: 'md5' | 'sha1' | 'sha256' | 'sha512';
  file_name?: string;
  file_size?: number;
  reputation?: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  associated_files?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface URL {
  value: string;
  description: string;
  protocol?: string;
  domain?: string;
  path?: string;
  reputation?: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  used_by?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface UserAccount {
  username: string;
  domain?: string;
  description: string;
  account_type?: 'admin' | 'user' | 'service' | 'system';
  privileges?: string[];
  compromised?: boolean;
  used_by?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface RegistryKey {
  key_path: string;
  value_name?: string;
  value_data?: string;
  value_type?: string;
  hive?: 'HKLM' | 'HKCU' | 'HKCR' | 'HKU' | 'HKCC';
  description: string;
  modified_by?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface NetworkPort {
  port_number: number;
  protocol: 'tcp' | 'udp' | 'icmp';
  service?: string;
  state?: 'open' | 'closed' | 'filtered';
  description: string;
  used_by?: string[];
  source_snippet?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface ThreatIndicators {
  ip_addresses?: IPAddress[];
  domains?: Domain[];
  file_hashes?: FileHash[];
  urls?: URL[];
  user_accounts?: UserAccount[];
  registry_keys?: RegistryKey[];
  network_ports?: NetworkPort[];
}

export interface ArticleContent {
  text: string;
  images?: {
    data: string;
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  }[];
}
