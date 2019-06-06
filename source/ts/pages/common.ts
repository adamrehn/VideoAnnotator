import { ErrorHandler } from '../ui/ErrorHandler';
import * as isDev from 'electron-is-dev';
import * as electron from 'electron';
import * as $ from 'jquery';

export function globalError(err : Error)
{
	//Display an error message and close the current window
	ErrorHandler.handleError(err);
	electron.remote.getCurrentWindow().close();
}

export function common()
{
	//Determine if we are running in development mode or production mode
	if (isDev === true)
	{
		//When running in development mode, enable Devtron and live-reload CSS changes
		require('devtron').install();
		require('electron-css-reload')();
	}
	else
	{
		//Hide the default menu when running in production mode
		electron.remote.Menu.setApplicationMenu(null);
	}
	
	//Install a window-wide default error handler when the page finishes loading
	$(document).ready(() =>
	{
		window.addEventListener('error', (e : ErrorEvent) => {
			globalError(new Error(e.message));
		});
	});
}
