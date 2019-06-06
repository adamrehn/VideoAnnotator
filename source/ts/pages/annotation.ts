import { AnnotatedVideo } from '../model/AnnotatedVideo';
import { AnnotationUI } from '../ui/AnnotationUI';
import { globalError } from './common';
import * as electron from 'electron';
import * as $ from 'jquery';

export function main()
{
	$(document).ready(() =>
	{
		//Load the annotation UI once we receive our dataset details
		electron.ipcRenderer.on('annotate-dataset', (event : any, details : any) =>
		{
			//Determine if we are creating a new dataset or opening an existing one
			if (details['type'] == 'new' && details['video'] !== undefined && details['schema'] !== undefined)
			{
				//Attempt to create a new dataset
				AnnotatedVideo.forVideo(details['video'], details['schema']).then((data : any) =>
				{
					//Load the annotation UI
					(<any>window).ui = new AnnotationUI($('#container'), data, null);
				})
				.catch((err : Error) => {
					globalError(err);
				});
			}
			else if (details['type'] == 'open' && details['dataset'] !== undefined)
			{
				//Attempt to load an existing dataset
				AnnotatedVideo.fromJSON(details['dataset']).then((data : any) =>
				{
					//Load the annotation UI
					(<any>window).ui = new AnnotationUI($('#container'), data, details['dataset']);
				})
				.catch((err : Error) => {
					globalError(err);
				});
			}
			else {
				globalError(new Error(`invalid details object: ${JSON.stringify(details)}`));
			}
		});
	});
}
