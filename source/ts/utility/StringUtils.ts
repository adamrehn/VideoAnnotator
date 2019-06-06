import * as moment from 'moment';
import 'moment-duration-format';

export class StringUtils
{
	//Formats a video playback position (specified in seconds) as a human-readable string
	public static formatPosition(position : number) {
		return moment.duration(position, 'seconds').format('hh:mm:ss', { trim: false });
	}
}
