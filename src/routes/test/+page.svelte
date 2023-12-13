<script lang="ts">
	export let data;
	$: console.log(data.result);
</script>

{JSON.stringify(data.result)}
