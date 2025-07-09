import { constants } from 'fs';
import * as fsp from 'fs/promises';

import { LogEvent, LogEventLevel, isEnabled } from './logEvent';
import { Sink } from './sink';

export enum FileSize {
  ONE_KB = 1024,
  ONE_MB = FileSize.ONE_KB * 1024,
  ONE_GB = FileSize.ONE_MB * 1024,
}

export interface FileSinkOptions {
  fileName?: string;
  outputDir?: string;
  maxFileSize?: number;
  restrictedToMinimumLevel?: LogEventLevel;
}

export const defaultFileSinkOptions: FileSinkOptions = {
  outputDir: './logs',
  maxFileSize: FileSize.ONE_MB * 10,
  restrictedToMinimumLevel: undefined,
};

export class FileSink implements Sink {
  protected options: FileSinkOptions;
  protected name: string;
  private content: string[];
  private fileSystem: typeof fsp;

  constructor(options: FileSinkOptions, fileSystem = fsp) {
    this.options = {
      ...defaultFileSinkOptions,
      ...(options || {})
    };
    this.name = this.options.fileName || new Date().toISOString().split('T')[0];
    this.content = [];
    this.fileSystem = fileSystem;
  }

  public async emit(events: LogEvent[]) {
    if (this.options.restrictedToMinimumLevel === LogEventLevel.off) return;

    await this.manageFiles();

    for (const event of events) {
      if (!isEnabled(this.options.restrictedToMinimumLevel, event.level)) continue;

      this.content.push(`[${LogEventLevel[event.level]}] ${event.messageTemplate.render()}`);
    }

    await this.flush();
  }

  public async flush() {
    if (this.content.length > 0) {
      await this.fileSystem.appendFile(this.filePath, this.content.join('\n'), {
        encoding: 'utf-8'
      });

      this.content.length = 0;
    }
  }

  private get filePath(): string {
    return `${this.options.outputDir}/${this.name}.log`;
  }

  /**
   * Check if the file exists and if it's size is greater than the maxFileSize
   * If the file is too big, we roll it
   */
  private async manageFiles() {
    this.changeFileNameIfDateChanged();
    await this.checkFileExists();
    const fileStats = await this.fileSystem.stat(this.filePath);

    if (fileStats.size >= this.options.maxFileSize) {
      await this.rollFile();
    }
  }

  /**
   * Check if the file exists and set the newFile flag accordingly
   */
  private async checkFileExists() {
    try {
      await this.fileSystem.access(this.filePath, constants.F_OK);
      this.content.push('\n');
    } catch (_error) {
      await this.fileSystem.writeFile(this.filePath, '', { encoding: 'utf-8' });
    }
  }

  /**
   * Roll the file by renaming it to include the number of files created today
   *
   * @remarks The file with no number is the most recent one, then followed by files in descending order.
  */
  private async rollFile() {
    try {
      const outputFiles = await this.fileSystem.readdir(this.options.outputDir);
      const todayFilesNumber = outputFiles.filter(filename => filename.includes(this.name)).length;

      await this.fileSystem.rename(this.filePath, `${this.filePath}.${todayFilesNumber}`);
    } catch (_error) {
      // File already renamed
    } finally {
      await this.checkFileExists();
    }
  }

  /**
   * If the file name is a date and if it's different from today's date, we change it
   */
  private changeFileNameIfDateChanged() {
    if (/\d{4}-\d{2}-\d{2}/.test(this.name)) {
      const potentialNewFileName = new Date().toISOString().split('T')[0];
      if (potentialNewFileName !== this.name) {
        this.name = potentialNewFileName;
      }
    }
  }
}
