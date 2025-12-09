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
        
        if (this.settings.dailyTemplate) {
            const templateFile = vault.getFileByPath(this.settings.dailyTemplate);
            if (templateFile) {
                templateContent = await vault.read(templateFile);
            }
        }
        
        const folder = vault.getFolderByPath(this.settings.dailyFolder);
        if (folder?.children) {
            for (const file of folder.children) {
                if (file instanceof TFile && file.extension === 'md') {
                    const content = (await vault.read(file)).trim();
                    if ((content === templateContent || content.length === 0) && !this.isNowDate(file.name)) {
                        await vault.delete(file);
                        console.log(`Deleted: ${file.path}`);
                    }
                    else {
                        const utcDate = this.parseDateSimple(file.basename, this.settings.dateFormat) 
                        if (utcDate && utcDate < this.getStartOfCurrentMonthUTC()) {
                            await this.app.vault.rename(file, "daily/old/"+file.name);
                        }
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

    formatDate(mask: string, date: Date): string {
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
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
        if (this.formatDate(this.settings.dateFormat, new Date()) + '.md' == name) {
            return true;
        }
        return false;
    }

    parseDateSimple(dateStr: string, mask: string): number | null {
        // Поддерживаемые маски
        const formats: Record<string, RegExp> = {
            'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
            'DD.MM.YYYY': /^(\d{2})\.(\d{2})\.(\d{4})$/,
            'YYYY/MM/DD': /^(\d{4})\/(\d{2})\/(\d{2})$/,
            'YYYY-MM-DD HH:mm': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/,
            'YYYY-MM-DD HH:mm:ss': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
        };
        
        if (!formats[mask]) {
            console.error(`Неподдерживаемая маска: ${mask}`);
            return null;
        }
        
        const match = dateStr.match(formats[mask]);
        if (!match) {
            console.error(`Дата "${dateStr}" не соответствует маске "${mask}"`);
            return null;
        }
        
        try {
            // Объявляем переменные со значениями по умолчанию
            let year: number = 0;
            let month: number = 0;
            let day: number = 1;
            let hour: number = 0;
            let minute: number = 0;
            let second: number = 0;
            
            // Парсим в зависимости от маски
            switch(mask) {
                case 'YYYY-MM-DD':
                case 'YYYY/MM/DD':
                    year = parseInt(match[1]);
                    month = parseInt(match[2]);
                    day = parseInt(match[3]);
                    break;
                    
                case 'DD.MM.YYYY':
                    day = parseInt(match[1]);
                    month = parseInt(match[2]);
                    year = parseInt(match[3]);
                    break;
                    
                case 'YYYY-MM-DD HH:mm':
                    year = parseInt(match[1]);
                    month = parseInt(match[2]);
                    day = parseInt(match[3]);
                    hour = parseInt(match[4]);
                    minute = parseInt(match[5]);
                    break;
                    
                case 'YYYY-MM-DD HH:mm:ss':
                    year = parseInt(match[1]);
                    month = parseInt(match[2]);
                    day = parseInt(match[3]);
                    hour = parseInt(match[4]);
                    minute = parseInt(match[5]);
                    second = parseInt(match[6]);
                    break;
                    
                default:
                    return null;
            }
            
            // Проверяем корректность значений
            if (isNaN(year) || isNaN(month) || isNaN(day)) {
                console.error('Некорректные значения даты');
                return null;
            }
            
            // Месяцы в JavaScript: 0-11
            const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);
            return utcTimestamp;
        } catch (error) {
            console.error('Ошибка парсинга:', error);
            return null;
        }
    }

    getStartOfCurrentMonthUTC(): number {
        const now = new Date();
        
        // Создаем дату начала месяца (1 число) в локальном часовом поясе
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Возвращаем timestamp в UTC
        return startOfMonth.getTime();
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