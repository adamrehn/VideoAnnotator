export class ObjectUtils
{
	//Determines the type of an object, explicitly differentiating arrays and null from objects
	public static typeOf(o : any)
	{
		if (o === null) {
			return 'null';
		}
		else if (Array.isArray(o) === true) {
			return 'array';
		}
		else {
			return typeof(o);
		}
	}
}
