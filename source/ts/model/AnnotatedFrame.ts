import { AnnotationMetadata } from './AnnotationMetadata';
import { SchemaField } from './MetadataSchema';

export class AnnotatedFrame
{
	//The position of the frame (in seconds)
	public position : number;
	
	//The metadata for the frame
	public metadata : AnnotationMetadata;
	
	public constructor(fields : SchemaField[], position? : number)
	{
		this.position = position || 0.0;
		this.metadata = new AnnotationMetadata(fields);
	}
	
	//Converts this frame into a plain object suitable for serialisation
	public toObject()
	{
		return {
			'position': this.position,
			'metadata': this.metadata.toObject()
		};
	}
	
	//Populates this frame with values from a plain object
	public fromObject(plain : any)
	{
		this.position = plain['position'];
		this.metadata.fromObject(plain['metadata']);
	}
}
