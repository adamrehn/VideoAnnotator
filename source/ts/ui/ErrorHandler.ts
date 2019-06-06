import * as electron from 'electron';

export class ErrorHandler
{
	//Displays an error message to the user
	public static handleError(err : Error) : void
	{
		if (err.message !== undefined) {
			electron.remote.dialog.showErrorBox('Error', `${err}`);
		}
		else {
			electron.remote.dialog.showErrorBox('Error', JSON.stringify(err));
		}
	}
}
