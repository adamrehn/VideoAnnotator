import mediainfo from 'node-mediainfo';

//Represents key metadata details about a video track
export class VideoDetails
{
	//The width of the video (in pixels)
	public width : number = 0;
	
	//The height of the video (in pixels)
	public height : number = 0;
	
	//The framerate of the video (in frames per second)
	public framerate : number = 0.0;
	
	//The duration of the video (in seconds)
	public duration : number = 0.0;
}

export class VideoUtils
{
	public static async getDetails(videoFile : string)
	{
		try
		{
			//Retrieve the metadata for the specified video file
			let metadata = await mediainfo(videoFile);
			
			//Attempt to locate the video track(s)
			let tracks = metadata.media.track.filter((t : any) => t['@type'] == 'Video');
			if (tracks.length < 1) {
				throw new Error('could not locate video track');
			}
			
			//Extract the key details for the first video track
			let details = new VideoDetails();
			details.width = Number.parseInt((<any>tracks[0]).Sampled_Width);
			details.height = Number.parseInt((<any>tracks[0]).Sampled_Height);
			details.framerate = Number.parseFloat((<any>tracks[0]).FrameRate);
			details.duration = Number.parseFloat((<any>tracks[0]).Duration);
			return details;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
}
