import * as electron from 'electron';

export class DialogProvider
{
	//Displays an informational message to the user
	public static showMessage(message : string) : Promise<any>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			electron.remote.dialog.showMessageBox({'message': message, 'buttons': ['OK']}, (response : number) => {
				resolve(true);
			});
		});
	}
	
	//Prompts the user for confirmation of an action
	public static showConfirmDialog(message : string, confirmButtonLabel : string) : Promise<boolean>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			electron.remote.dialog.showMessageBox({'message': message, 'buttons': [confirmButtonLabel, 'Cancel']}, (response : number) =>
			{
				if (response === 0) {
					resolve(true);
				}
				else {
					reject(false);
				}
			});
		});
	}
	
	//Prompts the user for an input path for opening a file or directory
	public static showOpenDialog(title : string, filters : any[], chooseDirs? : boolean) : Promise<string[]>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			electron.remote.dialog.showOpenDialog(
				<electron.BrowserWindow>(electron.remote.BrowserWindow.getFocusedWindow()),
				{
					'title': title,
					'filters': filters,
					'properties': [((chooseDirs === true) ? 'openDirectory' : 'openFile')]
				},
				(paths? : string[]) => {
					resolve(paths);
				}
			);
		});
	}
	
	//Prompts the user for an output file path for saving a file
	public static showSaveDialog(title : string, filters : any[]) : Promise<string>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			electron.remote.dialog.showSaveDialog(
				<electron.BrowserWindow>(electron.remote.BrowserWindow.getFocusedWindow()),
				{'title': title, 'filters': filters}, (path? : string) => {
					resolve(path);
				}
			);
		});
	}
}
