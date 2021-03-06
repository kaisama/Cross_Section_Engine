var slicerVertSource = 
[
	'precision highp float;',

	'attribute vec3 pos;',
	'attribute vec3 norm;',
	'attribute vec2 texcoords;',

	'varying vec3 frag_normal;',
	'varying vec3 frag_eyePos;',
	'varying vec3 frag_pos;',
	'//varying vec2 frag_texcoords;',
	
	'uniform mat4 model;',
	'uniform mat4 view;',
	'uniform mat4 projection;',

	'uniform vec3 eyePos;',

	'void main()',
	'{',
		'gl_Position = projection * view * model * vec4(pos, 1);',
		'frag_normal = (model * vec4(norm, 0)).xyz;',
		'frag_pos = (model * vec4(pos, 1)).xyz;',
		'frag_eyePos = eyePos;',
		'//frag_texcoords = texcoords;',
	'}'
].join('\n');

var slicerFragSource = 
[
	'precision highp float;',
	'#define MAX_SLICES 12',
	'varying vec3 frag_normal;',
	'varying vec3 frag_eyePos;',
	'varying vec3 frag_pos;',
	'//varying vec2 frag_texcoords;',

	'struct DirectionalLight',
	'{',
		'vec3 direction;',

		'vec3 ambient;',
		'vec3 diffuse;',
		'vec3 specular;',

		'float ambientStrength;',
	'};',

	'struct SlicePlane',
	'{',
		'vec4 equation;',
		'vec3 color;',
		'float use;',
		'float direction;',
	'};',

	'uniform SlicePlane slicePlanes[MAX_SLICES];',
	
	'uniform vec3 color;',
	'uniform DirectionalLight dirLight;',
	'//uniform sampler2D tex;',
	'uniform float beginSlicing;',

	'vec3 calcDirectional(DirectionalLight dir, vec3 normal, vec3 viewDir)',
	'{',
		'vec3 ambCol = dir.ambient * dir.ambientStrength * color;',

		'vec3 norm = (normal);',
		'vec3 lightDir = normalize(-dir.direction);',

		'float diffuseAngle = max(dot(norm, lightDir), 0.0);',
		'vec3 diffCol = diffuseAngle * dir.diffuse * color;',
		
		'vec3 halfway = normalize(viewDir + lightDir);',
	
		'float spec = pow(max(dot(norm, halfway), 0.0), 64.0);',
		'vec3 specCol = spec * dir.specular * 2.0 * color;',

		'vec3 finalLight = ambCol + (diffCol + specCol);',

		'return finalLight;',
	'}',

	'void shade(SlicePlane slice, vec3 objCol, int index)',
	'{',
		'if (slice.use == 1.0)' ,
		'{',
			'float dist1 = dot(frag_pos.xyz, slice.equation.xyz) + slice.equation.w;',

			'if (dist1 > 0.0)',
			'{',
				'if(beginSlicing == 1.0 || index == MAX_SLICES - 1)',
				'{',
					'discard;',
				'}',
				'else',
				'{',
					'gl_FragColor = vec4(slice.color * objCol, 1.0);',
				'}',
			'}',
			'else if (dist1 < 0.0 && beginSlicing == 1.0)',
			'{',
				'gl_FragColor = vec4(objCol * color, 1.0);',
			'}',
		'}',
	'}',

	'void main()',
	'{',
		'vec3 viewDir = normalize(frag_eyePos - frag_pos);',
		'vec3 normal = normalize(frag_normal);',
	
		'vec3 dirResult = calcDirectional(dirLight, normal, viewDir);',
		'for (int i = 0; i < MAX_SLICES; i++)',
		'{',
			'shade(slicePlanes[i], dirResult, i);',
		'}',
	'}'
].join('\n');

/*

'float dist1 = dot(frag_pos.xyz, slicePlanes[0].equation.xyz) + slicePlanes[0].equation.w;',
		'float dist2 = dot(frag_pos.xyz, slicePlanes[1].equation.xyz) + slicePlanes[1].equation.w;',
		
		'if(slicePlanes[0].direction == 1.0 && slicePlanes[1].direction == -1.0)',
		'{',
			'if ((dist1 > 0.0 && dist2 < 0.0) || (dist1 < 0.0 && dist2 > 0.0)) ',
			'{',
				'if(beginSlicing == 1.0)',
				'{',
					'discard;',
				'}',
				'else',
				'{',
					'gl_FragColor = vec4(1.0);',
				'}',
			'}',
			'else',
			'{',
				'gl_FragColor = vec4(dirResult * color, 1.0);',
			'}',
		'}',
		'else',
		'{',
			'if (dist1 > 0.0 && dist2 > 0.0) ',
			'{',
				'if(beginSlicing == 1.0)',
				'{',
					'discard;',
				'}',
				'else',
				'{',
					'gl_FragColor = vec4(1.0);',
				'}',
			'}',
			'else',
			'{',
				'gl_FragColor = vec4(dirResult * color, 1.0);',
			'}',
		'}

*/

var SlicerShader = function()
{
	this.shaderInst = new shader(slicerVertSource, slicerFragSource);

	this.init = function()
	{
		this.shaderInst.init();

		this.shaderInst.activate();

		this.shaderInst.addAttribute('pos', 0);
		this.shaderInst.addAttribute('norm', 1);
		//this.shaderInst.addAttribute('texcoords', 2);

		this.shaderInst.addUniform('model');
		this.shaderInst.addUniform('view');
		this.shaderInst.addUniform('projection');

		this.shaderInst.addUniform('color');
		this.shaderInst.addUniform('eyePos');

		this.shaderInst.addUniform('dirLight.direction');
		this.shaderInst.addUniform('dirLight.ambient');
		this.shaderInst.addUniform('dirLight.ambientStrength');
		this.shaderInst.addUniform('dirLight.diffuse');
		this.shaderInst.addUniform('dirLight.specular');

		for (var i = 0; i < 12; i++) 
		{
			this.shaderInst.addUniform('slicePlanes[' + i + '].equation');
			this.shaderInst.addUniform('slicePlanes[' + i + '].direction');
			this.shaderInst.addUniform('slicePlanes[' + i + '].color');
			this.shaderInst.addUniform('slicePlanes[' + i + '].use');
		}

		this.shaderInst.addUniform('beginSlicing');
	}

	this.updateUniforms = function(renderable, trans, camera, clipPlanes)
	{
		this.shaderInst.activate();

		// if (trans != null) 
		// {
			this.shaderInst.setUniformMat4f('model',  multiplyM4(renderable.transform.getModelMatrix(), trans.getModelMatrix()));			
		// }
		// else
		// {
			// this.shaderInst.setUniformMat4f('model',  renderable.transform.getModelMatrix());
		// }
		
		this.shaderInst.setUniformMat4f('view', camera.getViewMatrix());
		this.shaderInst.setUniformMat4f('projection', camera.getProjectionMatrix());

		this.shaderInst.setUniform3f('color', renderable.color);
		this.shaderInst.setUniform3f('eyePos', camera.viewData.position);
		var dir = new vector3(-20, -30, -20);
		var diff = new vector3(1, 1, 1);
		var spec = new vector3(1, 1, 1);
		var amb = new vector3(1, 1, 1);
		var ambstr = 0.5;
		this.shaderInst.setUniform3f('dirLight.direction', dir);
		this.shaderInst.setUniform3f('dirLight.ambient', amb);
		this.shaderInst.setUniform1f('dirLight.ambientStrength', ambstr);
		this.shaderInst.setUniform3f('dirLight.diffuse', diff);
		this.shaderInst.setUniform3f('dirLight.specular', spec);

		// this.shaderInst.setUniform1f('beginSlicing', clipPlanes[0].beginSlicing);
		
		// this.shaderInst.setUniform4f('slicePlanes[0].equation', clipPlanes[0].plane.equation);
		// if (clipPlanes[0].plane.direction == 'front')
		// {
		// 	this.shaderInst.setUniform1f('slicePlanes[0].direction', 1);
		// } 
		// else
		// {
		// 	this.shaderInst.setUniform1f('slicePlanes[0].direction', -1);
		// }		

		// this.shaderInst.setUniform3f('slicePlanes[0].color', clipPlanes[0].color);
		// this.shaderInst.setUniform1f('slicePlanes[0].use', 1);

		for (var i = 0; i < clipPlanes.length; i++) 
		{
			this.shaderInst.setUniform1f('beginSlicing', clipPlanes[i].beginSlicing);

			this.shaderInst.setUniform4f('slicePlanes[' + i + '].equation', clipPlanes[i].plane.equation);

			if (clipPlanes[i].plane.direction == 'front')
			{
				this.shaderInst.setUniform1f('slicePlanes[' + i + '].direction', 1);
			} 
			else
			{
				this.shaderInst.setUniform1f('slicePlanes[' + i + '].direction', -1);
			}		

			this.shaderInst.setUniform3f('slicePlanes[' + i + '].color', clipPlanes[i].color);
			this.shaderInst.setUniform1f('slicePlanes[' + i + '].use', clipPlanes[i].use);
		}
	}
}