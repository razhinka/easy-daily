import { Plugin, PluginSettingTab, Setting, App, TFile } from 'obsidian';

interface EasyDailySettings {
    dailyFolder: string;
    dailyTemplate: string;
    dateFormat: string;
}

export default class EasyDaily extends Plugin {
    settings!: EasyDailySettings;

    async onload() {
        console.log('EasyDaily loaded');
        await this.loadSettings();
        this.addSettingTab(new EasyDailySettingTab(this.app, this));
        
        this.addCommand({
            id: 'clean-empty-notes',
            name: 'Clean empty daily notes',
            callback: () => this.cleanEmptyNotes()
        });
    }

    async cleanEmptyNotes() {
        const vault = this.app.vault;
        let templateContent = '';
        
        // Read template if set
        if (this.settings.dailyTemplate) {
            const templateFile = vault.getFileByPath(this.settings.dailyTemplate);
            if (templateFile) {
                templateContent = await vault.read(templateFile);
            }
        }
        
        // Get daily folder
        const folder = vault.getFolderByPath(this.settings.dailyFolder);
        if (folder?.children) {
            for (const file of folder.children) {
                if (file instanceof TFile && file.extension === 'md') {
                    const content = (await vault.read(file)).trim();
                    if ((content === templateContent || content.length === 0) && !this.isNowDate(file.name)) {
                        await vault.delete(file);
                        console.log(`Deleted: ${file.path}`);
                    }
                }
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    formatDate(mask: string): string {
        const now = new Date();
    
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        const YYYY = year.toString();
        const YY = YYYY.slice(-2);
        const MM = month.toString().padStart(2, '0');
        const M = month.toString();
        const DD = day.toString().padStart(2, '0');
        const D = day.toString();
        const HH = hours.toString().padStart(2, '0');
        const H = hours.toString();
        const mm = minutes.toString().padStart(2, '0');
        const m = minutes.toString();
        const ss = seconds.toString().padStart(2, '0');
        const s = seconds.toString();
        
        return mask
            .replace('YYYY', YYYY)
            .replace('YY', YY)
            .replace('MM', MM)
            .replace('M', M)
            .replace('DD', DD)
            .replace('D', D)
            .replace('HH', HH)
            .replace('H', H)
            .replace('mm', mm)
            .replace('m', m)
            .replace('ss', ss)
            .replace('s', s);
    }

    isNowDate(name : string) : boolean {
        if (this.settings.dateFormat == undefined) {
            this.settings.dateFormat = "YYYY-MM-DD";
        }

        console.log(this.formatDate(this.settings.dateFormat), name);

        if (this.formatDate(this.settings.dateFormat) + '.md' == name) {
            return true;
        }
        return false;
    }
}

class EasyDailySettingTab extends PluginSettingTab {
    plugin: EasyDaily;

    constructor(app: App, plugin: EasyDaily) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl('h2', { text: 'EasyDaily Settings' });
        
        new Setting(containerEl)
            .setName('Daily folder')
            .setDesc('Folder where daily notes are stored')
            .addText(text => text
                .setPlaceholder('path')
                .setValue(this.plugin.settings.dailyFolder)
                .onChange(async (value) => {
                    this.plugin.settings.dailyFolder = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Daily template')
            .setDesc('Path to template file for daily notes')
            .addText(text => text
                .setPlaceholder('template.md')
                .setValue(this.plugin.settings.dailyTemplate)
                .onChange(async (value) => {
                    this.plugin.settings.dailyTemplate = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Date format')
            .setDesc('Date format that using for naming daily notes')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.dateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dateFormat = value;
                    await this.plugin.saveSettings();
                })
            )
    }
}