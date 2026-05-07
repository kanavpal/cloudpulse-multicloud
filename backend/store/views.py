from django.http import JsonResponse

def health(request):
    return JsonResponse({"status": "UP"})

def whoami(request):
    return JsonResponse({"cloud": "LOCAL"})