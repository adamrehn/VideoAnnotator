import { FileUI } from '../ui/FileUI';
import * as $ from 'jquery';

export function main()
{
	$(document).ready(() =>
	{
		//Load our UI
		(<any>window).ui = new FileUI();
	});
}
