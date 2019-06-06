import { MetadataSchema, SchemaField } from './MetadataSchema';
import { ObjectUtils } from '../utility/ObjectUtils';

export class AnnotationMetadata
{
	//Our payload of key/value pairs
	private payload : Map<string, Object>;
	
	//The schema definitions for our metadata fields
	private fields : SchemaField[]
	
	public constructor(fields : SchemaField[])
	{
		//Store our schema definitions
		this.fields = fields;
		
		//Populate our metadata values with the default values for their datatypes
		this.payload = new Map<string, Object>();
		for (let field of this.fields)
		{
			let value = MetadataSchema.defaultValueForType(field);
			this.payload.set(field.name, value);
		}
	}
	
	//Returns the schema definition for the specified field
	private getField(key : string)
	{
		//Verify that the specified field is valid
		let matches = this.fields.filter((field : SchemaField) => field.name == key);
		if (matches.length == 0) {
			throw new Error(`unrecognised metadata field "${key}"`);
		}
		
		return matches[0];
	}
	
	public get(key : string)
	{
		//Verify that the specified field is valid
		this.getField(key);
		
		//Retrieve the value for the field
		return this.payload.get(key);
	}
	
	public set(key : string, value : any)
	{
		//Retrieve the schema definition for the specified field
		let field = this.getField(key);
		
		//If we were given a string value but the field is not a string datatype,
		//parse the supplied string into a value of the correct datatype
		if (field.type != 'string' && ObjectUtils.typeOf(value) == 'string') {
			value = MetadataSchema.parseValue(field, value);
		}
		
		//If the field only allows a predefined set of values, validate the specified value
		if (field.values !== undefined && field.values.length > 0 && field.values.indexOf(value) == -1) {
			throw new Error(`invalid value "${value}" for metadata field "${key}"`);
		}
		
		//Store the validated value
		this.payload.set(key, value);
	}
	
	//Converts our metadata into a plain object suitable for serialisation
	public toObject()
	{
		let plain : any = {};
		for (let [key, value] of this.payload) {
			plain[key] = value;
		}
		
		return plain;
	}
	
	//Populates our metadata with values from a plain object
	public fromObject(plain : any)
	{
		for (let key of Object.keys(plain)) {
			this.set(key, plain[key]);
		}
	}
}
