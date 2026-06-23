
import React, { useState } from 'react';
import { generateReasoningResponse } from '../services/geminiService';

type InstallerTab = 'overview' | 'prerequisites' | 'install' | 'configure' | 'deploy' | 'verify';

interface Step {
  title: string;
  description: string;
  commands: string[];
  notes?: string;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-auto shrink-0 px-3 py-1.5 bg-white/10 hover:bg-teal-600 text-zinc-400 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-white/10"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
};

const CommandBlock: React.FC<{ commands: string[] }> = ({ commands }) => (
  <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/5">
    {commands.map((cmd, i) => (
      <div key={i} className="flex items-start gap-4 px-6 py-3 border-b border-white/5 last:border-0 group hover:bg-white/5 transition-colors">
        <span className="text-teal-500 font-black text-xs mt-0.5 shrink-0">$</span>
        <code className="text-green-300 text-xs font-mono flex-1 whitespace-pre-wrap break-all leading-relaxed">{cmd}</code>
        <CopyButton text={cmd} />
      </div>
    ))}
  </div>
);

const StepCard: React.FC<{ step: Step; index: number }> = ({ step, index }) => (
  <div className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start gap-5 p-8 pb-4">
      <div className="w-10 h-10 rounded-xl bg-[#136f6f] text-white flex items-center justify-center text-sm font-black shrink-0 mt-0.5">
        {index + 1}
      </div>
      <div>
        <h3 className="font-black text-zinc-900 google-sans uppercase tracking-tight text-sm">{step.title}</h3>
        <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{step.description}</p>
      </div>
    </div>
    <div className="px-8 pb-8">
      <CommandBlock commands={step.commands} />
      {step.notes && (
        <div className="mt-4 flex gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <span className="text-amber-500 shrink-0">⚠</span>
          <p className="text-[10px] text-amber-700 font-medium leading-relaxed">{step.notes}</p>
        </div>
      )}
    </div>
  </div>
);

const BPOLY_CONFIG = {
  institutionName: 'Bulawayo Polytechnic',
  shortName: 'BPoly',
  domain: 'bpoly.ac.zw',
  adminEmail: 'library@bpoly.ac.zw',
  city: 'Bulawayo',
  country: 'ZW',
  dbName: 'dspace',
  dbUser: 'dspace',
  dspaceDir: '/dspace',
  srcDir: '/build/dspace-src',
  javaVersion: '17',
  dspaceVersion: '7.6.2',
};

const prerequisiteSteps: Step[] = [
  {
    title: 'Update system packages',
    description: 'Ensure the Ubuntu/Debian server is fully updated before installing dependencies.',
    commands: ['sudo apt update && sudo apt upgrade -y'],
  },
  {
    title: 'Install Java 17 (OpenJDK)',
    description: 'DSpace 7.x requires Java 17. Install OpenJDK and set it as the default JVM.',
    commands: [
      'sudo apt install -y openjdk-17-jdk',
      'sudo update-alternatives --config java',
      'java -version',
    ],
  },
  {
    title: 'Install Apache Maven 3.8+',
    description: 'Maven is used to build the DSpace source code.',
    commands: [
      'sudo apt install -y maven',
      'mvn -version',
    ],
    notes: 'If the apt version is below 3.8, download manually from https://maven.apache.org/download.cgi',
  },
  {
    title: 'Install & configure PostgreSQL 15',
    description: 'DSpace requires PostgreSQL with the pgcrypto extension enabled.',
    commands: [
      'sudo apt install -y postgresql postgresql-contrib',
      'sudo systemctl enable --now postgresql',
      `sudo -u postgres createuser --username postgres -d -A -P ${BPOLY_CONFIG.dbUser}`,
      `sudo -u postgres createdb --username postgres -O ${BPOLY_CONFIG.dbUser} ${BPOLY_CONFIG.dbName}`,
      `sudo -u postgres psql -d ${BPOLY_CONFIG.dbName} -c 'CREATE EXTENSION pgcrypto;'`,
    ],
  },
  {
    title: 'Install Apache Ant',
    description: 'Ant is used to run the DSpace deployment scripts after the Maven build.',
    commands: ['sudo apt install -y ant'],
  },
  {
    title: 'Install Apache Solr 8.x',
    description: 'DSpace 7.x uses Solr as its search engine. Install it as a service.',
    commands: [
      'wget https://archive.apache.org/dist/lucene/solr/8.11.3/solr-8.11.3.tgz -P /tmp',
      'tar -xzf /tmp/solr-8.11.3.tgz solr-8.11.3/bin/install_solr_service.sh --strip-components=2 -C /tmp',
      'sudo bash /tmp/install_solr_service.sh /tmp/solr-8.11.3.tgz',
      'sudo systemctl enable --now solr',
      'sudo -u solr /opt/solr/bin/solr status',
    ],
  },
  {
    title: 'Install Tomcat 9',
    description: 'The DSpace server-side backend (REST API) is deployed on Apache Tomcat.',
    commands: [
      'sudo apt install -y tomcat9',
      `sudo mkdir -p /home/tomcat9 && sudo chown tomcat:tomcat /home/tomcat9`,
      'sudo systemctl enable tomcat9',
    ],
  },
  {
    title: 'Install Node.js 18 & Yarn (for frontend)',
    description: 'The DSpace Angular UI requires Node.js 18 and Yarn package manager.',
    commands: [
      'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -',
      'sudo apt install -y nodejs',
      'sudo npm install -g yarn',
      'node -v && yarn -v',
    ],
  },
];

const installSteps: Step[] = [
  {
    title: 'Create the dspace system user',
    description: 'Create a dedicated non-root user to own all DSpace files.',
    commands: [
      'sudo useradd -m -d /home/dspace -s /bin/bash dspace',
      `sudo mkdir -p ${BPOLY_CONFIG.dspaceDir} ${BPOLY_CONFIG.srcDir}`,
      `sudo chown dspace:dspace ${BPOLY_CONFIG.dspaceDir} ${BPOLY_CONFIG.srcDir}`,
    ],
  },
  {
    title: 'Download DSpace source',
    description: `Download DSpace ${BPOLY_CONFIG.dspaceVersion} from GitHub and extract it.`,
    commands: [
      `wget https://github.com/DSpace/DSpace/archive/refs/tags/dspace-${BPOLY_CONFIG.dspaceVersion}.tar.gz -P /tmp`,
      `sudo tar -xzf /tmp/dspace-${BPOLY_CONFIG.dspaceVersion}.tar.gz -C ${BPOLY_CONFIG.srcDir} --strip-components=1`,
      `sudo chown -R dspace:dspace ${BPOLY_CONFIG.srcDir}`,
    ],
  },
  {
    title: 'Configure local.cfg for Bulawayo Polytechnic',
    description: 'Copy the example config and set institution-specific values before building.',
    commands: [
      `sudo -u dspace cp ${BPOLY_CONFIG.srcDir}/dspace/config/local.cfg.EXAMPLE ${BPOLY_CONFIG.srcDir}/dspace/config/local.cfg`,
      `sudo -u dspace nano ${BPOLY_CONFIG.srcDir}/dspace/config/local.cfg`,
    ],
    notes: 'Use the "Configure" tab above to auto-generate a pre-filled local.cfg for Bulawayo Polytechnic.',
  },
  {
    title: 'Build DSpace with Maven',
    description: 'Compile and package DSpace from source. This may take 10–20 minutes.',
    commands: [
      `cd ${BPOLY_CONFIG.srcDir} && sudo -u dspace mvn package -Dmirage2.on=true -Dmirage2.deps.included=false`,
    ],
    notes: 'Ensure Maven has internet access to download dependencies from Maven Central.',
  },
  {
    title: 'Run Ant fresh_install',
    description: 'Deploy the compiled packages into the DSpace installation directory.',
    commands: [
      `cd ${BPOLY_CONFIG.srcDir}/dspace/target/dspace-installer`,
      `sudo -u dspace ant fresh_install`,
    ],
  },
  {
    title: 'Initialise the database schema',
    description: 'Create all DSpace database tables and initial data.',
    commands: [
      `sudo -u dspace ${BPOLY_CONFIG.dspaceDir}/bin/dspace database migrate`,
    ],
  },
  {
    title: 'Create the first administrator account',
    description: 'Set up the initial DSpace administrator for Bulawayo Polytechnic Library.',
    commands: [
      `sudo -u dspace ${BPOLY_CONFIG.dspaceDir}/bin/dspace create-administrator`,
    ],
    notes: `Use ${BPOLY_CONFIG.adminEmail} as the admin email address.`,
  },
];

const deploySteps: Step[] = [
  {
    title: 'Copy DSpace webapps to Tomcat',
    description: 'Link or copy the built web applications into Tomcat\'s webapps directory.',
    commands: [
      `sudo ln -s ${BPOLY_CONFIG.dspaceDir}/webapps/server /var/lib/tomcat9/webapps/server`,
      'sudo systemctl restart tomcat9',
      'sudo systemctl status tomcat9',
    ],
  },
  {
    title: 'Create DSpace Solr cores',
    description: 'Register the DSpace Solr cores (search, statistics, authority, oai).',
    commands: [
      `sudo -u dspace ${BPOLY_CONFIG.dspaceDir}/bin/dspace solr-reindex`,
    ],
  },
  {
    title: 'Build & launch the Angular UI',
    description: 'Build the DSpace Angular frontend and start it with PM2.',
    commands: [
      `cd ${BPOLY_CONFIG.srcDir}/dspace-angular`,
      'sudo -u dspace yarn install',
      'sudo -u dspace yarn build:prod',
      'sudo npm install -g pm2',
      `sudo -u dspace pm2 start "yarn start:prod" --name dspace-ui`,
      'sudo -u dspace pm2 save && sudo pm2 startup',
    ],
  },
  {
    title: 'Install & configure Nginx reverse proxy',
    description: 'Put Nginx in front of both Tomcat (REST) and the Angular UI.',
    commands: [
      'sudo apt install -y nginx',
      `sudo nano /etc/nginx/sites-available/${BPOLY_CONFIG.domain}`,
    ],
    notes: 'Use the config snippet generated in the "Configure" tab. Enable the site with: sudo ln -s /etc/nginx/sites-available/bpoly.ac.zw /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx',
  },
  {
    title: 'Enable & start all services',
    description: 'Ensure all services start automatically on server reboot.',
    commands: [
      'sudo systemctl enable --now postgresql solr tomcat9 nginx',
      'sudo systemctl status postgresql solr tomcat9 nginx',
    ],
  },
];

const verifySteps: Step[] = [
  {
    title: 'Check DSpace REST API',
    description: 'Verify the backend API is responding on Tomcat.',
    commands: [
      'curl -s http://localhost:8080/server/api | python3 -m json.tool | head -20',
    ],
  },
  {
    title: 'Check Solr health',
    description: 'Confirm all DSpace Solr cores are active.',
    commands: [
      'curl -s "http://localhost:8983/solr/admin/cores?action=STATUS&wt=json" | python3 -m json.tool',
    ],
  },
  {
    title: 'Verify database connectivity',
    description: 'Confirm DSpace can connect to PostgreSQL.',
    commands: [
      `sudo -u dspace ${BPOLY_CONFIG.dspaceDir}/bin/dspace database test`,
    ],
  },
  {
    title: 'Run DSpace indexing',
    description: 'Perform a full index of all content to populate search.',
    commands: [
      `sudo -u dspace ${BPOLY_CONFIG.dspaceDir}/bin/dspace index-discovery -f`,
    ],
  },
  {
    title: 'Access the web interface',
    description: 'Open the DSpace repository in a browser to confirm the UI loads.',
    commands: [
      `curl -I http://${BPOLY_CONFIG.domain}`,
    ],
    notes: `The Angular UI should be reachable at https://${BPOLY_CONFIG.domain} after SSL is configured.`,
  },
];

const DSpaceInstaller: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InstallerTab>('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<string | null>(null);
  const [generatedNginx, setGeneratedNginx] = useState<string | null>(null);
  const [configType, setConfigType] = useState<'localcfg' | 'nginx'>('localcfg');
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  const toggleProgress = (key: string) => {
    setProgress(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const completedSteps = Object.values(progress).filter(Boolean).length;
  const totalSteps = prerequisiteSteps.length + installSteps.length + deploySteps.length + verifySteps.length;

  const generateLocalCfg = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Generate a complete DSpace 7.6 local.cfg configuration file for ${BPOLY_CONFIG.institutionName} in ${BPOLY_CONFIG.city}, Zimbabwe.
Use these exact values:
- dspace.dir = ${BPOLY_CONFIG.dspaceDir}
- dspace.server.url = https://ir.${BPOLY_CONFIG.domain}/server
- dspace.ui.url = https://ir.${BPOLY_CONFIG.domain}
- dspace.name = ${BPOLY_CONFIG.institutionName} Institutional Repository
- dspace.shortname = ${BPOLY_CONFIG.shortName} IR
- db.url = jdbc:postgresql://localhost:5432/${BPOLY_CONFIG.dbName}
- db.username = ${BPOLY_CONFIG.dbUser}
- mail.server = localhost
- mail.from.address = ${BPOLY_CONFIG.adminEmail}
- mail.admin = ${BPOLY_CONFIG.adminEmail}
- solr.server = http://localhost:8983/solr
- handle.canonical.prefix = https://ir.${BPOLY_CONFIG.domain}/handle/
- authentication-password.domain.valid = ${BPOLY_CONFIG.domain}

Include settings for: handle server, email, search/browse, metadata defaults, OAI-PMH, statistics. Format as a real .cfg file with comments. Do not add markdown fences.`;

      const result = await generateReasoningResponse(prompt, 8000);
      setGeneratedConfig(result.text || '# Error generating config');
      setConfigType('localcfg');
    } catch (e) {
      setGeneratedConfig('# Generation failed. Please check your API key and retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateNginxConfig = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Generate an Nginx server block (virtual host) configuration for DSpace 7.6 at ${BPOLY_CONFIG.institutionName}.

Requirements:
- Domain: ir.${BPOLY_CONFIG.domain}
- HTTP → HTTPS redirect
- HTTPS on port 443 with Let's Encrypt SSL (placeholder paths)
- Proxy / → Node.js DSpace Angular UI on localhost:4000
- Proxy /server → Tomcat on localhost:8080/server (REST API)
- Proper proxy headers (X-Forwarded-For, Host, etc.)
- Gzip compression
- Static file caching headers
- Security headers (X-Frame-Options, X-Content-Type-Options, CSP)

Output only the Nginx config with comments. No markdown fences.`;

      const result = await generateReasoningResponse(prompt, 6000);
      setGeneratedNginx(result.text || '# Error generating Nginx config');
      setConfigType('nginx');
    } catch (e) {
      setGeneratedNginx('# Generation failed. Please check your API key and retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs: { id: InstallerTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '🏛️' },
    { id: 'prerequisites', label: 'Prerequisites', icon: '📦' },
    { id: 'install', label: 'Install', icon: '⚙️' },
    { id: 'configure', label: 'Configure', icon: '🔧' },
    { id: 'deploy', label: 'Deploy', icon: '🚀' },
    { id: 'verify', label: 'Verify', icon: '✅' },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar bg-[#fbfcfd]">
      <div className="max-w-5xl mx-auto w-full px-6 py-8 pb-32">

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[#136f6f] rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-teal-900/20">
              🗄️
            </div>
            <div>
              <h1 className="text-2xl font-black google-sans text-zinc-900 uppercase tracking-tighter">
                DSpace 7.6 Installer
              </h1>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                Bulawayo Polytechnic — Institutional Repository Setup
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Installation Progress</span>
              <span className="text-[9px] font-black text-[#136f6f]">{completedSteps} / {totalSteps} steps</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div
                className="bg-[#136f6f] h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
              />
            </div>
          </div>
        </header>

        {/* Tab Bar */}
        <div className="flex bg-zinc-100 p-1 rounded-2xl shadow-inner mb-8 overflow-x-auto gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-[#136f6f] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#136f6f] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 text-[180px] opacity-5 leading-none">🗄️</div>
              <span className="inline-block px-3 py-1 bg-white/10 text-[9px] font-black uppercase tracking-widest rounded-full border border-white/20 mb-6">
                DSpace {BPOLY_CONFIG.dspaceVersion}
              </span>
              <h2 className="text-3xl font-black google-sans uppercase tracking-tighter mb-3">
                {BPOLY_CONFIG.institutionName}<br />Institutional Repository
              </h2>
              <p className="text-teal-100/80 max-w-xl text-sm leading-relaxed">
                This wizard guides the IT team through a full DSpace 7.6 installation on the Bulawayo Polytechnic server — from Java and PostgreSQL prerequisites through to a live, indexed repository accessible to staff and students.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: '🖥️', title: 'Server OS', value: 'Ubuntu 22.04 LTS (recommended)', sub: 'Debian 11+ also supported' },
                { icon: '☕', title: 'Java Version', value: `OpenJDK ${BPOLY_CONFIG.javaVersion}`, sub: 'Required — do not use Java 8 or 11' },
                { icon: '🐘', title: 'Database', value: 'PostgreSQL 15+', sub: 'with pgcrypto extension' },
                { icon: '🔍', title: 'Search Engine', value: 'Apache Solr 8.11', sub: 'Local instance on port 8983' },
                { icon: '🌐', title: 'Frontend Server', value: 'Node.js 18 + Yarn', sub: 'Angular UI on port 4000' },
                { icon: '⚡', title: 'Backend Server', value: 'Apache Tomcat 9', sub: 'REST API on port 8080' },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-xl flex items-center justify-center shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">{item.title}</p>
                    <p className="text-sm font-black text-zinc-900">{item.value}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#136f6f] mb-4">Installation Path Summary</h3>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-zinc-100">
                {[
                  { n: '01', label: 'Prerequisites', desc: 'Java, Maven, PostgreSQL, Solr, Tomcat, Node.js' },
                  { n: '02', label: 'Source Build', desc: 'Download DSpace, configure local.cfg, Maven package, Ant deploy' },
                  { n: '03', label: 'Configuration', desc: 'AI-generated local.cfg and Nginx reverse proxy config' },
                  { n: '04', label: 'Deploy', desc: 'Angular UI via PM2, REST API via Tomcat, Nginx frontend' },
                  { n: '05', label: 'Verify', desc: 'REST API, Solr cores, database, full-text indexing' },
                ].map(s => (
                  <div key={s.n} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[9px] font-black flex items-center justify-center shrink-0 -ml-3 border-2 border-white">{s.n}</div>
                    <div>
                      <p className="text-xs font-black text-zinc-900 uppercase">{s.label}</p>
                      <p className="text-[10px] text-zinc-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Server Quick Start */}
            <div className="bg-zinc-900 rounded-[2rem] p-8 text-white">
              <p className="text-[9px] font-black uppercase tracking-widest text-teal-400 mb-4">Server Quick Start — Run These Commands on the BPoly Server</p>
              <div className="space-y-2">
                {[
                  '# 1. SSH into the server as a sudo user',
                  'ssh admin@<server-ip>',
                  '',
                  '# 2. Clone this repo',
                  'sudo apt install -y git',
                  'git clone https://github.com/wgmasvix-hue/chengetAI2.8.git /opt/chengetai',
                  'cd /opt/chengetai/dspace-install',
                  '',
                  '# 3. Set your database password (required before running)',
                  'cp .env.example .env',
                  'nano .env   # set DB_PASSWORD to a strong password (12+ chars)',
                  '',
                  '# 4. Run the full installer (takes ~45 min total)',
                  'sudo bash install.sh',
                  '',
                  '# 5. Optional: lock down firewall after install',
                  'sudo bash firewall.sh',
                ].map((line, i) => (
                  <div key={i} className={`flex items-start gap-3 ${line === '' ? 'h-2' : ''}`}>
                    {line !== '' && (
                      <>
                        <span className={`text-xs font-mono shrink-0 mt-0.5 ${line.startsWith('#') ? 'text-zinc-500' : 'text-teal-400'}`}>
                          {line.startsWith('#') ? '#' : '$'}
                        </span>
                        <code className={`text-xs font-mono flex-1 ${line.startsWith('#') ? 'text-zinc-500 italic' : 'text-green-300'}`}>
                          {line.startsWith('#') ? line.slice(2) : line}
                        </code>
                        {!line.startsWith('#') && <CopyButton text={line} />}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-zinc-500 mt-4 font-medium">
                To run a single step: <code className="text-teal-400">sudo bash install.sh --step 4</code> &nbsp;|&nbsp;
                Resume from step: <code className="text-teal-400">sudo bash install.sh --from 5</code>
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 flex gap-4">
              <span className="text-2xl shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-black text-amber-800 uppercase tracking-wide mb-1">Before You Begin</p>
                <ul className="text-[11px] text-amber-700 space-y-1 list-disc list-inside leading-relaxed">
                  <li>Run all commands as a user with <code className="bg-amber-100 px-1 rounded font-mono">sudo</code> privileges</li>
                  <li>Minimum server specs: 8 GB RAM, 4 vCPU, 100 GB storage</li>
                  <li>Ensure outbound internet access to Maven Central and GitHub during the build step</li>
                  <li>Point the DNS A record for <code className="bg-amber-100 px-1 rounded font-mono">ir.{BPOLY_CONFIG.domain}</code> to this server's IP before step 07 (Nginx/SSL)</li>
                  <li>The full install log is at <code className="bg-amber-100 px-1 rounded font-mono">/var/log/dspace-install.log</code></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Prerequisites Tab */}
        {activeTab === 'prerequisites' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-zinc-900 rounded-[2rem] px-8 py-6 flex items-center gap-4 text-white">
              <span className="text-3xl">📦</span>
              <div>
                <p className="font-black google-sans uppercase tracking-tight text-sm">Step 1 — System Prerequisites</p>
                <p className="text-zinc-400 text-xs mt-0.5">Install all required software packages before downloading DSpace.</p>
              </div>
            </div>
            {prerequisiteSteps.map((step, i) => (
              <div key={i} className="relative">
                <button
                  onClick={() => toggleProgress(`pre-${i}`)}
                  className={`absolute top-6 right-6 w-7 h-7 rounded-lg border-2 flex items-center justify-center text-sm transition-all z-10 ${
                    progress[`pre-${i}`]
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-zinc-200 text-transparent hover:border-teal-400'
                  }`}
                  title="Mark as complete"
                >
                  ✓
                </button>
                <div className={`transition-opacity ${progress[`pre-${i}`] ? 'opacity-50' : ''}`}>
                  <StepCard step={step} index={i} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Install Tab */}
        {activeTab === 'install' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-zinc-900 rounded-[2rem] px-8 py-6 flex items-center gap-4 text-white">
              <span className="text-3xl">⚙️</span>
              <div>
                <p className="font-black google-sans uppercase tracking-tight text-sm">Step 2 — Build & Install DSpace</p>
                <p className="text-zinc-400 text-xs mt-0.5">Download source, configure, compile, and initialise the database.</p>
              </div>
            </div>
            {installSteps.map((step, i) => (
              <div key={i} className="relative">
                <button
                  onClick={() => toggleProgress(`inst-${i}`)}
                  className={`absolute top-6 right-6 w-7 h-7 rounded-lg border-2 flex items-center justify-center text-sm transition-all z-10 ${
                    progress[`inst-${i}`]
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-zinc-200 text-transparent hover:border-teal-400'
                  }`}
                  title="Mark as complete"
                >
                  ✓
                </button>
                <div className={`transition-opacity ${progress[`inst-${i}`] ? 'opacity-50' : ''}`}>
                  <StepCard step={step} index={i} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Configure Tab */}
        {activeTab === 'configure' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-zinc-900 rounded-[2rem] px-8 py-6 flex items-center gap-4 text-white">
              <span className="text-3xl">🔧</span>
              <div>
                <p className="font-black google-sans uppercase tracking-tight text-sm">Step 3 — AI Configuration Generator</p>
                <p className="text-zinc-400 text-xs mt-0.5">Generate production-ready configuration files pre-filled for Bulawayo Polytechnic.</p>
              </div>
            </div>

            {/* Institution summary */}
            <div className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-5">Institution Parameters (Auto-filled)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Institution', value: BPOLY_CONFIG.institutionName },
                  { label: 'Domain', value: `ir.${BPOLY_CONFIG.domain}` },
                  { label: 'Admin Email', value: BPOLY_CONFIG.adminEmail },
                  { label: 'Install Dir', value: BPOLY_CONFIG.dspaceDir },
                  { label: 'Database', value: BPOLY_CONFIG.dbName },
                  { label: 'DSpace Version', value: BPOLY_CONFIG.dspaceVersion },
                ].map((item, i) => (
                  <div key={i} className="bg-zinc-50 rounded-xl p-4">
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">{item.label}</p>
                    <p className="text-xs font-mono font-bold text-zinc-700">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Generator buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={generateLocalCfg}
                disabled={isGenerating}
                className="flex items-center gap-4 p-6 bg-[#136f6f] hover:bg-[#1a8b8b] text-white rounded-[2rem] text-left transition-all shadow-xl shadow-teal-900/20 disabled:opacity-60"
              >
                <span className="text-3xl shrink-0">📄</span>
                <div>
                  <p className="font-black uppercase tracking-tight text-sm">Generate local.cfg</p>
                  <p className="text-teal-100/70 text-[10px] mt-0.5">DSpace main configuration with all BPoly values</p>
                </div>
                {isGenerating && configType === 'localcfg' && (
                  <div className="ml-auto w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                )}
              </button>

              <button
                onClick={generateNginxConfig}
                disabled={isGenerating}
                className="flex items-center gap-4 p-6 bg-zinc-900 hover:bg-zinc-800 text-white rounded-[2rem] text-left transition-all shadow-xl disabled:opacity-60"
              >
                <span className="text-3xl shrink-0">🌐</span>
                <div>
                  <p className="font-black uppercase tracking-tight text-sm">Generate Nginx Config</p>
                  <p className="text-zinc-400 text-[10px] mt-0.5">Reverse proxy for Angular UI + REST API with SSL</p>
                </div>
                {isGenerating && configType === 'nginx' && (
                  <div className="ml-auto w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0" />
                )}
              </button>
            </div>

            {/* Generated output */}
            {(generatedConfig || generatedNginx) && (
              <div className="bg-white border border-zinc-100 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-100">
                  <div className="flex gap-2">
                    {generatedConfig && (
                      <button
                        onClick={() => setConfigType('localcfg')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          configType === 'localcfg' ? 'bg-[#136f6f] text-white' : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        local.cfg
                      </button>
                    )}
                    {generatedNginx && (
                      <button
                        onClick={() => setConfigType('nginx')}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          configType === 'nginx' ? 'bg-[#136f6f] text-white' : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        Nginx
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const text = configType === 'localcfg' ? generatedConfig : generatedNginx;
                      if (text) navigator.clipboard.writeText(text);
                    }}
                    className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#136f6f] transition-colors"
                  >
                    Copy All
                  </button>
                </div>
                <pre className="p-8 text-[10px] font-mono text-zinc-700 overflow-x-auto max-h-[500px] custom-scrollbar leading-relaxed whitespace-pre-wrap">
                  {configType === 'localcfg' ? generatedConfig : generatedNginx}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Deploy Tab */}
        {activeTab === 'deploy' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-zinc-900 rounded-[2rem] px-8 py-6 flex items-center gap-4 text-white">
              <span className="text-3xl">🚀</span>
              <div>
                <p className="font-black google-sans uppercase tracking-tight text-sm">Step 4 — Deploy Services</p>
                <p className="text-zinc-400 text-xs mt-0.5">Configure Tomcat, Angular UI, and Nginx to serve DSpace on the network.</p>
              </div>
            </div>
            {deploySteps.map((step, i) => (
              <div key={i} className="relative">
                <button
                  onClick={() => toggleProgress(`dep-${i}`)}
                  className={`absolute top-6 right-6 w-7 h-7 rounded-lg border-2 flex items-center justify-center text-sm transition-all z-10 ${
                    progress[`dep-${i}`]
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-zinc-200 text-transparent hover:border-teal-400'
                  }`}
                  title="Mark as complete"
                >
                  ✓
                </button>
                <div className={`transition-opacity ${progress[`dep-${i}`] ? 'opacity-50' : ''}`}>
                  <StepCard step={step} index={i} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Verify Tab */}
        {activeTab === 'verify' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-emerald-600 rounded-[2rem] px-8 py-6 flex items-center gap-4 text-white">
              <span className="text-3xl">✅</span>
              <div>
                <p className="font-black google-sans uppercase tracking-tight text-sm">Step 5 — Verification Checks</p>
                <p className="text-emerald-100/70 text-xs mt-0.5">Confirm all services are running and the repository is accessible.</p>
              </div>
            </div>
            {verifySteps.map((step, i) => (
              <div key={i} className="relative">
                <button
                  onClick={() => toggleProgress(`ver-${i}`)}
                  className={`absolute top-6 right-6 w-7 h-7 rounded-lg border-2 flex items-center justify-center text-sm transition-all z-10 ${
                    progress[`ver-${i}`]
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-zinc-200 text-transparent hover:border-teal-400'
                  }`}
                  title="Mark as complete"
                >
                  ✓
                </button>
                <div className={`transition-opacity ${progress[`ver-${i}`] ? 'opacity-50' : ''}`}>
                  <StepCard step={step} index={i} />
                </div>
              </div>
            ))}

            {completedSteps === totalSteps && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8 text-center">
                <p className="text-5xl mb-4">🎉</p>
                <p className="font-black google-sans text-emerald-800 text-xl uppercase tracking-tight">
                  DSpace Is Live!
                </p>
                <p className="text-emerald-600 text-sm mt-2">
                  {BPOLY_CONFIG.institutionName} Institutional Repository is fully installed and running.
                </p>
                <a
                  href={`https://ir.${BPOLY_CONFIG.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-6 px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                >
                  Open Repository →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DSpaceInstaller;
