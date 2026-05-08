import swaggerSpec from '../../../../lib/swagger';

export async function GET() {
  return new Response(JSON.stringify(swaggerSpec), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
