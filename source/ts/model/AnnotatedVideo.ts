import { VideoDetails, VideoUtils } from '../utility/VideoUtils';
import { AnnotatedSegment } from './AnnotatedSegment';
import { MetadataSchema } from './MetadataSchema';
import { ObjectUtils } from '../utility/ObjectUtils';
import { StringUtils } from '../utility/StringUtils';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

export class AnnotatedVideo
{
	//The path of the video file for this dataset
	public readonly video : string;
	
	//The details for the first video track in the video file
	//(Note that this field is only stored in memory at runtime and is not serialised)
	public readonly details : VideoDetails;
	
	//The path of the metadata schema file for this dataset
	public readonly schemaFile : string;
	
	//The metadata schema for this dataset
	//(Note that this field is only stored in memory at runtime and is not serialised)
	public readonly schema : MetadataSchema;
	
	//The list of annotated segments
	private segments : AnnotatedSegment[];
	
	//Don't publicly expose our constructor, since datasets should only be created via the methods below
	protected constructor(video : string, details : VideoDetails, schemaFile : string, schema : any)
	{
		this.video = video;
		this.details = details;
		this.schemaFile = schemaFile;
		this.schema = schema;
		this.segments = [];
	}
	
	//Creates a new dataset for a video file with the specified metadata schema
	public static async forVideo(videoFile : string, schemaFile : any)
	{
		try
		{
			//Resolve the video file and metadata schema file paths to absolute paths
			videoFile = path.resolve(videoFile);
			schemaFile = path.resolve(schemaFile);
			
			//Parse the video metadata for the video file (dimensions, framerate, etc.)
			let details = await VideoUtils.getDetails(videoFile);
			
			//Parse the specified metadata schema file
			let schema = await MetadataSchema.loadSchema(schemaFile);
			
			//Populate a new AnnotatedVideo object
			return new AnnotatedVideo(videoFile, details, schemaFile, schema);
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Loads a dataset from a JSON file
	public static async fromJSON(jsonFile : string)
	{
		try
		{
			//Attempt to read the specified JSON file
			const readPromise = promisify(fs.readFile);
			let json = await readPromise(jsonFile, {encoding: 'utf-8'});
			
			//Attempt to parse the JSON data
			let data = JSON.parse(json);
			
			//Check that we have a video path string
			if (ObjectUtils.typeOf(data['video']) != 'string') {
				throw new Error('dataset does not contain a top-level "video" string');
			}
			
			//Check that we have a schema path string
			if (ObjectUtils.typeOf(data['schema']) != 'string') {
				throw new Error('dataset does not contain a top-level "schema" string');
			}
			
			//Check that we have a segments array
			if (ObjectUtils.typeOf(data['segments']) != 'array') {
				throw new Error('dataset does not contain a top-level "segments" array');
			}
			
			//Resolve the video file and metadata schema file paths to absolute paths
			let jsonDir = path.dirname(jsonFile);
			let videoAbsolute = path.resolve(jsonDir, data['video']);
			let schemaAbsolute = path.resolve(jsonDir, data['schema']);
			
			//Attempt to load the specified video file and metadata schema file
			let annotated = await AnnotatedVideo.forVideo(videoAbsolute, schemaAbsolute);
			
			//Load the metadata
			annotated.segments = data['segments'].map((segmentPlain : any) =>
			{
				let segment = new AnnotatedSegment(annotated.schema.fields.segments, annotated.schema.fields.frames);
				segment.fromObject(segmentPlain);
				return segment;
			});
			
			//Return the reconstructed dataset
			return annotated;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Serialises this dataset to a JSON file
	public async toJSON(jsonFile : string)
	{
		try
		{
			//Convert our annotated segments to a list of plain objects
			let segmentsPlain = this.segments.map((segment : AnnotatedSegment) => segment.toObject());
			
			//Convert our video file and metadata schema file paths to relative paths
			let jsonDir = path.dirname(jsonFile);
			let videoRelative = path.relative(jsonDir, this.video);
			let schemaRelative = path.relative(jsonDir, this.schemaFile);
			
			//Convert our plain object representation to JSON
			let json = JSON.stringify({
				'video': videoRelative,
				'schema': schemaRelative,
				'segments': segmentsPlain
			}, null, 4);
			
			//Attempt to write the JSON to file
			const writePromise = promisify(fs.writeFile);
			await writePromise(jsonFile, json, {encoding: 'utf-8'});
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Sorts our segments array in chronological order
	private sortSegments() {
		this.segments.sort((a : AnnotatedSegment, b : AnnotatedSegment) => a.start - b.start);
	}
	
	//Rounds the specified position to the nearest frame
	public toNearestFrame(position : number) {
		return (Math.round(position * this.details.framerate) / this.details.framerate);
	}
	
	//Retrieves the frame object for the specified position (if any)
	public getFrame(position : number)
	{
		//Verify that a segment exists at the specified position
		let segment = this.getSegment(position);
		if (segment === null) {
			throw new Error(`no segment found at position ${StringUtils.formatPosition(position)}`);
		}
		
		//Attempt to retrieve the frame at the specified position
		return segment.getFrame(position);
	}
	
	//Returns a shallow copy of our list of segments
	public getSegments() {
		return this.segments.slice();
	}
	
	//Retrieves the index for the segment containing the specified position (if any)
	public getSegmentIndex(position : number)
	{
		for (let index = 0; index < this.segments.length; ++index)
		{
			if (this.segments[index].start <= position && this.segments[index].end >= position) {
				return index;
			}
		}
		
		return null;
	}
	
	//Retrieves the segment object containing the specified position (if any)
	public getSegment(position : number)
	{
		let index = this.getSegmentIndex(position);
		return ((index !== null) ? this.segments[index] : null);
	}
	
	//Adds a new segment at the specified starting point and returns it
	public addSegment(start : number)
	{
		//Perform bounds checking on the start time
		if (start < 0 || start > this.details.duration) {
			throw new Error(`specified segment starting time ${StringUtils.formatPosition(start)} is out of bounds`);
		}
		
		//Verify that the specified start time does not collide with an existing segment
		let existing = this.getSegment(start);
		if (existing !== null) {
			throw new Error(`an existing segment already contains the position ${StringUtils.formatPosition(start)}`);
		}
		
		//Automatically set the ending position to the maximum permissable position
		let laterSegments = this.segments.filter((segment : AnnotatedSegment) => segment.start > start);
		let end = ((laterSegments.length > 0) ? laterSegments[0].start : this.details.duration);
		
		//Add the new segment to our list
		let segment = new AnnotatedSegment(this.schema.fields.segments, this.schema.fields.frames, start, end);
		this.segments.push(segment);
		
		//Re-sort our list of segments to maintain chronological order
		this.sortSegments();
		
		//Return the segment object
		return segment;
	}
	
	//Deletes the segment at the specified position
	public deleteSegment(position : number)
	{
		//Verify that a segment exists at the specified position
		let index = this.getSegmentIndex(position);
		if (index === null) {
			throw new Error(`no segment found at position ${StringUtils.formatPosition(position)}`);
		}
		
		//Remove the segment
		this.segments.splice(index, 1);
	}
	
	//Truncates the segment at the specified position using the specified end position
	public truncateSegment(position : number, end : number)
	{
		//Verify that a segment exists at the specified position
		let segment = this.getSegment(position);
		if (segment === null) {
			throw new Error(`no segment found at position ${StringUtils.formatPosition(position)}`);
		}
		
		//Attempt to perform the truncation
		segment.truncate(end);
	}
	
	//Determines the number of frames that would be discarded if a truncation operation was performed on a segment
	public truncateWouldDiscard(position : number, end : number)
	{
		//Verify that a segment exists at the specified position
		let segment = this.getSegment(position);
		if (segment === null) {
			throw new Error(`no segment found at position ${StringUtils.formatPosition(position)}`);
		}
		
		//Report the number of frames that would be discarded by the truncation
		return segment.truncateWouldDiscard(end);
	}
	
	//Adds a new frame to the segment at the specified position and returns it
	public addFrame(position : number)
	{
		//Verify that a segment exists at the specified position
		let segment = this.getSegment(position);
		if (segment === null) {
			throw new Error(`no segment found at position ${StringUtils.formatPosition(position)}`);
		}
		
		//Attempt to add a new frame
		let frame = segment.addFrame(position);
		
		//Return the new frame
		return frame;
	}
	
	//Deletes the frame at the specified position
	public deleteFrame(position : number)
	{
		//Verify that a segment exists at the specified position
		let segment = this.getSegment(position);
		if (segment === null) {
			throw new Error(`no segment found at position ${StringUtils.formatPosition(position)}`);
		}
		
		//Attempt to remove the frame
		segment.deleteFrame(position);
	}
}
