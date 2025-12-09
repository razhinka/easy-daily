import { Plugin, Notice, Vault, TFile } from 'obsidian';

export default class EasyDaily extends Plugin {

    async onload() {
        const thisVault = this.app.vault;

        console.log('Plugin is loaded');

        const templatePath = this.app.vault.getFileByPath("template/daily template.md");
        let template = '';

        if (templatePath) { 
            template = await this.app.vault.read(templatePath);
        }
        
        const path = this.app.vault.getFolderByPath('daily');
        if (path?.children) {
            for (let file of path.children) {
                if (file instanceof TFile && file.extension == 'md') {
                    const content = await thisVault.read(file);
                    if (content == template || content.length == 0) {
                        thisVault.delete(file);
                    }
                }
            }
        }
    }

    onunload() {
        console.log('EasyDaily: plugin is unloaded');
    }
}