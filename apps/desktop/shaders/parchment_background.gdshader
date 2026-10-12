shader_type canvas_item;

uniform vec4 base_color : source_color = vec4(0.19, 0.14, 0.10, 1.0);
uniform vec4 mid_color : source_color = vec4(0.24, 0.18, 0.12, 1.0);
uniform vec4 stain_color : source_color = vec4(0.33, 0.24, 0.15, 1.0);
uniform vec4 edge_color : source_color = vec4(0.08, 0.06, 0.04, 1.0);
uniform float grain_scale = 220.0;
uniform float grain_strength = 0.12;
uniform float stain_strength = 0.22;
uniform float vignette_strength = 0.54;
uniform float glow_strength = 0.16;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(in vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void fragment() {
	vec2 uv = UV;
	vec2 center_uv = uv - vec2(0.5);
	float radial = length(center_uv * vec2(1.08, 0.92));
	float vignette = smoothstep(0.24, 0.92, radial);

	float t = TIME * 0.02;
	float g = noise(uv * grain_scale + vec2(t, -t));
	float g2 = noise(uv * (grain_scale * 0.34) + vec2(-t * 1.3, t * 0.8));
	float stain = noise(uv * 17.0 + vec2(t * 0.7, -t * 0.5));
	float warm_glow = smoothstep(0.72, 0.05, radial);

	vec3 col = mix(base_color.rgb, mid_color.rgb, g * grain_strength + 0.18);
	col = mix(col, stain_color.rgb, stain * stain_strength);
	col += vec3(0.9, 0.72, 0.42) * warm_glow * glow_strength;
	col = mix(col, edge_color.rgb, vignette * vignette_strength);
	col += (g2 - 0.5) * 0.06;

	COLOR = vec4(col, base_color.a);
}
