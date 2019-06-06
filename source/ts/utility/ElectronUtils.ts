import * as electron from 'electron';

export class ElectronUtils
{
	//Creates a browser window and shows it once the page has loaded
	public static createAndShow(url : string, options? : any)
	{
		//Our default browser window options
		let defaultOptions : any = {
			'center':         true,
			'show':           false,
			'resizable':      true,
			'useContentSize': true,
			'fullscreenable': false,
			'webPreferences': {
				'nodeIntegration': true
			}
		}
		
		//Merge any user-supplied options with our defaults
		if (options !== undefined)
		{
			for (let option of Object.keys(options)) {
				defaultOptions[option] = options[option];
			}
		}
		
		//Create the browser window
		let browserWindow = new electron.BrowserWindow(defaultOptions);
		
		//Display the window only once initial loading is complete
		browserWindow.once('ready-to-show', () => {
			(<Electron.BrowserWindow>browserWindow).show();
		});
		
		//Load the specified page
		browserWindow.loadURL(url);
		
		//Return the BrowserWindow object
		return browserWindow;
	}
}
