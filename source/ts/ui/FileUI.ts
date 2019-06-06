import { DialogProvider } from '../ui/DialogProvider';
import * as electron from 'electron';
import * as path from 'path';
import * as $ from 'jquery';

export class FileUI
{
	//Our "Open Dataset" button
	private openButton : JQuery<HTMLButtonElement>;
	
	//Our "Create Dataset" button
	private newButton : JQuery<HTMLButtonElement>;
	
	//Our "Browse" buttons and accompanying labels for our video and schema files
	private videoPathLabel : JQuery<HTMLSpanElement>;
	private schemaPathLabel : JQuery<HTMLSpanElement>;
	private chooseVideoButton : JQuery<HTMLButtonElement>;
	private chooseSchemaButton : JQuery<HTMLButtonElement>;
	
	//The selected video and schema file paths
	private video : string = '';
	private schema : string = '';
	
	public constructor()
	{
		//Bind our element references
		this.openButton = $('#open');
		this.newButton = $('#new');
		this.videoPathLabel = $('#video-label');
		this.schemaPathLabel = $('#schema-label');
		this.chooseVideoButton = $('#choose-video');
		this.chooseSchemaButton = $('#choose-schema');
		
		//Set the initial state for our "Create Dataset" button
		this.updateCreateButton();
		
		//Wire up our event listeners
		this.wireEvents();
	}
	
	//Sends our dataset details to the annotation screen and closes this window
	private sendDetails(details : any)
	{
		//Send the dataset details to the annotation screen
		electron.ipcRenderer.send('dataset-details', details);
		
		//Close this browser window
		electron.remote.getCurrentWindow().close();
	}
	
	//Enables or disables the "Create Dataset" button based on whether we have the required file paths
	private updateCreateButton()
	{
		if (this.video.length == 0 || this.schema.length == 0) {
			this.newButton.attr('disabled', 'disabled');
		}
		else {
			this.newButton.removeAttr('disabled');
		}
	}
	
	//Displays a file dialog for a "Browse" button
	private browseForFile(title : string, filters : any[], label : JQuery<HTMLElement>, handler : (path : string) => void)
	{
		//Prompt the user for the file path
		DialogProvider.showOpenDialog(title, filters)
		.then((paths : string[]) =>
		{
			if (paths !== undefined && paths.length > 0)
			{
				//Pass the selected path to the supplied handler callback
				handler(paths[0]);
				
				//Update our UI
				label.text(path.basename(paths[0]));
				this.updateCreateButton();
			}
		})
		.catch(() => {
			//The user cancelled the open dialog
		});
	}
	
	//Wires up our event listeners
	private wireEvents()
	{
		//Wire up the "Browse" button for the video file
		this.chooseVideoButton.click(() =>
		{
			this.browseForFile('Choose video file', [{name: 'Video files', extensions: ['ogv', 'm4v', 'mkv', 'mp4', 'webm']}], this.videoPathLabel, (path : string) => {
				this.video = path;
			})
		});
		
		//Wire up the "Browse" button for the schema file
		this.chooseSchemaButton.click(() =>
		{
			this.browseForFile('Choose schema file', [{name: 'Schema files', extensions: ['json', 'yml', 'yaml']}], this.schemaPathLabel, (path : string) => {
				this.schema = path;
			})
		});
		
		//Wire up our "Open Dataset" button
		this.openButton.click(() =>
		{
			//Prompt the user for the dataset path
			DialogProvider.showOpenDialog('Open existing dataset', [{name: 'Dataset files', extensions: ['json']}])
			.then((paths : string[]) =>
			{
				if (paths !== undefined && paths.length > 0)
				{
					//Attempt to open the dataset
					this.sendDetails({
						'type': 'open',
						'dataset': paths[0]
					});
				}
			})
			.catch(() => {
				//The user cancelled the open dialog
			});
		});
		
		//Wire up our "Create Dataset" button
		this.newButton.click(() =>
		{
			if (this.video.length > 0 && this.schema.length > 0)
			{
				//Attempt to create the dataset
				this.sendDetails({
					'type': 'new',
					'video': this.video,
					'schema': this.schema
				});
			}
		});
	}
}
