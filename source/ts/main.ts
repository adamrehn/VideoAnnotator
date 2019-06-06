import { ElectronUtils } from './utility/ElectronUtils';
import { app, ipcMain } from 'electron';
import * as path from 'path';

//Maintain references to our windows to prevent them being freed prematurely
let fileWindow : Electron.BrowserWindow | null;
let annotationWindow : Electron.BrowserWindow | null;

//Quit when all browser windows are closed
app.on('window-all-closed', () => {
	app.quit();
});

//Wait until Electron has completed startup initialisation
app.on('ready', () =>
{
	//Create the annotation browser window when we receive data from the file window
	ipcMain.once('dataset-details', (event : any, details : any) =>
	{
		//Create the annotation browser window
		annotationWindow = ElectronUtils.createAndShow('file://' + path.dirname(__dirname) + '/pages/annotation.html', {
			'width':     1280,
			'height':    720,
			'minWidth':  1280,
			'minHeight': 720
		});
		
		//Make sure we release our reference to the annotation window when it is closed
		annotationWindow.on('closed', () => {
			annotationWindow = null;
		});
		
		//Forward the dataset details to the annotation page once loading is complete
		annotationWindow.once('ready-to-show', () => {
			(<Electron.BrowserWindow>annotationWindow).webContents.send('annotate-dataset', details);
		});
	});
	
	//Create the file browser window
	fileWindow = ElectronUtils.createAndShow('file://' + path.dirname(__dirname) + '/pages/file.html', {
		'width':     1280,
		'height':    480,
		'minWidth':  1280,
		'minHeight': 480,
		'resizable': false
	});
	
	//Make sure we release our reference to the file window when it is closed
	fileWindow.on('closed', () => {
		fileWindow = null;
	});
});
