import { AnnotationMetadata } from './AnnotationMetadata';
import { AnnotatedFrame } from './AnnotatedFrame';
import { StringUtils } from '../utility/StringUtils';
import { SchemaField } from './MetadataSchema';

export class AnnotatedSegment
{
	//The starting position of the segment (in seconds)
	public start : number;
	
	//The ending position of the segment (in seconds)
	public end : number;
	
	//The metadata for the segment
	public metadata : AnnotationMetadata;
	
	//The list of annotated frames within the segment
	private frames : AnnotatedFrame[];
	
	//The schema definitions for the metadata fields for our annotated frames
	private frameFields : SchemaField[];
	
	public constructor(segmentFields : SchemaField[], frameFields : SchemaField[], start? : number, end? : number)
	{
		this.metadata = new AnnotationMetadata(segmentFields);
		this.frameFields = frameFields;
		this.start = start || 0.0;
		this.end = end || 0.0;
		this.frames = [];
	}
	
	//Sorts our frames array in chronological order
	private sortFrames() {
		this.frames.sort((a : AnnotatedFrame, b : AnnotatedFrame) => a.position - b.position);
	}
	
	//Returns a shallow copy of our list of frames
	public getFrames() {
		return this.frames.slice();
	}
	
	//Retrieves the index for the frame at the specified position (if any)
	public getFrameIndex(position : number)
	{
		for (let index = 0; index < this.frames.length; ++index)
		{
			if (this.frames[index].position == position) {
				return index;
			}
		}
		
		return null;
	}
	
	//Retrieves the frame object for the specified position (if any)
	public getFrame(position : number)
	{
		let index = this.getFrameIndex(position);
		return ((index !== null) ? this.frames[index] : null);
	}
	
	//Adds a new frame to the segment and returns it
	public addFrame(position : number)
	{
		//Perform bounds checking on the frame position
		if (position < this.start || position > this.end) {
			throw new Error(`specified frame time ${StringUtils.formatPosition(position)} is out of bounds`);
		}
		
		//Verify that the specified position does not collide with an existing frame
		let index = this.getFrameIndex(position);
		if (index !== null) {
			throw new Error(`cannot add a duplicate frame at position ${StringUtils.formatPosition(position)}`);
		}
		
		//Add the new frame to our list
		let frame = new AnnotatedFrame(this.frameFields, position);
		this.frames.push(frame);
		
		//Re-sort our list of frames to maintain chronological order
		this.sortFrames();
		
		//Return the frame object
		return frame;
	}
	
	//Determines the number of frames that would be discarded if a truncation operation was performed
	public truncateWouldDiscard(end : number) {
		return this.frames.filter((frame : AnnotatedFrame) => frame.position > end).length;
	}
	
	//Updates the ending point of this segment, discarding any frames in the truncated section
	public truncate(end : number)
	{
		//Verify that the new ending position falls after our starting position
		if (end <= this.start) {
			throw new Error('segment end position must come after segment start position');
		}
		
		//Set the new ending position
		this.end = end;
		
		//Discard any truncated frames
		this.frames = this.frames.filter((frame : AnnotatedFrame) => frame.position <= end);
	}
	
	//Deletes the frame at the specified position
	public deleteFrame(position : number)
	{
		//Verify that a frame exists at the specified position
		let index = this.getFrameIndex(position);
		if (index === null) {
			throw new Error(`no frame found at position ${StringUtils.formatPosition(position)}`);
		}
		
		//Remove the segment
		this.frames.splice(index, 1);
	}
	
	//Converts this segment into a plain object suitable for serialisation
	public toObject()
	{
		return {
			'start': this.start,
			'end': this.end,
			'metadata': this.metadata.toObject(),
			'frames': this.frames.map((frame : AnnotatedFrame) => frame.toObject())
		};
	}
	
	//Populates this segment with values from a plain object
	public fromObject(plain : any)
	{
		this.start = plain['start'];
		this.end = plain['end'];
		this.metadata.fromObject(plain['metadata']);
		this.frames = plain['frames'].map((framePlain : any) =>
		{
			let frame = new AnnotatedFrame(this.frameFields);
			frame.fromObject(framePlain);
			return frame;
		});
	}
}
