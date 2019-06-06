import { ObjectUtils } from '../utility/ObjectUtils';
import { promisify } from 'util';
import * as jsyaml from 'js-yaml';
import * as fs from 'fs';

//Type definition for an individual metadata field in a parsed schema object
export interface SchemaField
{
	name : string;
	type : 'boolean' | 'float' | 'int' | 'string';
	values : any[] | undefined;
}

//Type definition for the root node of a parsed metadata object
export interface SchemaRoot
{
	segments : SchemaField[];
	frames : SchemaField[];
}

export class MetadataSchema
{
	//Type definitions for when we treat parsed schema objects as MetadataSchema instances
	public fields! : SchemaRoot;
	
	//Returns the default value for the supplied metadata field
	public static defaultValueForType(field : SchemaField)
	{
		//If the field has a list of permissable values then use the first item in the list
		if (field.values !== undefined && field.values.length > 0) {
			return field.values[0];
		}
		
		//For freeform fields use the default value for the field's datatype
		switch (field.type)
		{
			case 'boolean':
				return false;
			
			case 'float':
				return 0.0;
			
			case 'int':
				return 0;
			
			case 'string':
				return '';
			
			default:
				throw new Error(`unrecognised metadata datatype "${field.type}"`);
		}
	}
	
	//Parses a string value into the appropriate datatype for the supplied metadata field
	public static parseValue(field : SchemaField, value : string)
	{
		switch (field.type)
		{
			case 'boolean':
				return (value == 'true');
			
			case 'float':
				return Number.parseFloat(value);
			
			case 'int':
				return Number.parseInt(value);
			
			case 'string':
				return value;
			
			default:
				throw new Error(`unrecognised metadata datatype "${field.type}"`);
		}
	}
	
	//Loads a metadata schema YAML/JSON file
	public static async loadSchema(schemaFile : string)
	{
		try
		{
			//Attempt to parse the specified YAML/JSON file
			const readPromise = promisify(fs.readFile);
			let schemaData = await readPromise(schemaFile, {encoding: 'utf-8'});
			let schema = jsyaml.safeLoad(schemaData);
			
			//Check that we have the root fields object
			if (ObjectUtils.typeOf(schema['fields']) != 'object') {
				throw new Error('schema does not contain a top-level "fields" object');
			}
			
			//Check that we have a segments array
			let segmentsArray = <any[]>(schema['fields']['segments']);
			if (ObjectUtils.typeOf(segmentsArray) != 'array') {
				throw new Error('schema does not contain a "segments" array in the top-level "fields" object');
			}
			
			//Check that we have a frames array
			let framesArray = <any[]>(schema['fields']['frames']);
			if (ObjectUtils.typeOf(framesArray) != 'array') {
				throw new Error('schema does not contain a "frames" array in the top-level "fields" object');
			}
			
			//Validate the entries in both arrays
			let combinedArray = segmentsArray.concat(framesArray);
			for (let entry of combinedArray)
			{
				//Check that we have a field name
				if (ObjectUtils.typeOf(entry['name']) != 'string') {
					throw new Error('field does not contain a valid name');
				}
				
				//Check that we have a field type
				if (ObjectUtils.typeOf(entry['type']) != 'string' || ['boolean', 'float', 'int', 'string'].indexOf(entry['type']) == -1) {
					throw new Error('field does not contain a valid type');
				}
				
				//Check that the list of acceptable values is actually an array (if present)
				let valuesType = ObjectUtils.typeOf(entry['values']);
				if (valuesType != 'undefined' && valuesType != 'array') {
					throw new Error('field does not contain a valid list of acceptable values');
				}
			}
			
			return <MetadataSchema>schema;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
}
